from __future__ import annotations

import ipaddress
import json
import re
import shutil
import subprocess
import tomllib
from functools import lru_cache
from pathlib import Path
from urllib.parse import urlparse

from .shared import ensure_dir, read_text, utf8_text_subprocess_kwargs, write_text

_MIN_XHIGH_SUPPORTED_VERSION = (0, 63, 0)
_CHAT_WIRE_COMPAT_VERSION = (0, 57, 0)
_CODEX_VERSION_PATTERN = re.compile(r"codex-cli\s+(\d+)\.(\d+)\.(\d+)", re.IGNORECASE)
_CODEX_HOME_SYNCED_FILES = ("config.toml", "auth.json")
_CODEX_HOME_SYNCED_DIRS = ("skills", "agents", "prompts")
_CODEX_HOME_QUEST_OVERLAY_DIRS = ("skills", "prompts")
_ROOT_TABLE_SECTION_PATTERN = re.compile(r"^\s*\[")
_ROOT_MODEL_ASSIGNMENT_PATTERN = re.compile(r"^\s*(model_provider|model)\s*=")
_COMPAT_BEGIN_MARKER = "# BEGIN DEEPSCIENTIST PROFILE COMPAT"
_COMPAT_END_MARKER = "# END DEEPSCIENTIST PROFILE COMPAT"
_MISSING_ENV_PATTERN = re.compile(r"Missing environment variable:\s*[`'\"]?([^`'\"\s]+)", re.IGNORECASE)
_LOCAL_PROVIDER_HOST_ALIASES = {"localhost", "host.docker.internal"}
_OFFICIAL_OPENAI_HOSTS = {"api.openai.com"}


def parse_codex_cli_version(text: str) -> tuple[int, int, int] | None:
    match = _CODEX_VERSION_PATTERN.search(str(text or ""))
    if not match:
        return None
    return tuple(int(part) for part in match.groups())


@lru_cache(maxsize=32)
def codex_cli_version(binary: str) -> tuple[int, int, int] | None:
    normalized = str(binary or "").strip()
    if not normalized:
        return None
    try:
        result = subprocess.run(
            [normalized, "--version"],
            check=False,
            capture_output=True,
            timeout=10,
            **utf8_text_subprocess_kwargs(),
        )
    except (OSError, subprocess.TimeoutExpired):
        return None
    return parse_codex_cli_version(f"{result.stdout}\n{result.stderr}")


def format_codex_cli_version(version: tuple[int, int, int] | None) -> str:
    if version is None:
        return ""
    return ".".join(str(part) for part in version)


def chat_wire_compatible_codex_version() -> tuple[int, int, int]:
    return _CHAT_WIRE_COMPAT_VERSION


def _split_root_table_lines(config_text: str) -> tuple[list[str], list[str]]:
    lines = str(config_text or "").splitlines()
    for index, line in enumerate(lines):
        if _ROOT_TABLE_SECTION_PATTERN.match(line):
            return lines[:index], lines[index:]
    return lines, []


def _strip_root_model_assignments(lines: list[str]) -> list[str]:
    filtered: list[str] = []
    skipping_compat_block = False
    for line in lines:
        stripped = line.strip()
        if stripped == _COMPAT_BEGIN_MARKER:
            skipping_compat_block = True
            continue
        if skipping_compat_block:
            if stripped == _COMPAT_END_MARKER:
                skipping_compat_block = False
            continue
        if _ROOT_MODEL_ASSIGNMENT_PATTERN.match(line):
            continue
        filtered.append(line)
    while filtered and not filtered[0].strip():
        filtered.pop(0)
    while filtered and not filtered[-1].strip():
        filtered.pop()
    return filtered


def _join_field_names(fields: list[str]) -> str:
    if not fields:
        return ""
    if len(fields) == 1:
        return fields[0]
    if len(fields) == 2:
        return f"{fields[0]} and {fields[1]}"
    return ", ".join(fields[:-1]) + f", and {fields[-1]}"


def normalize_codex_reasoning_effort(
    reasoning_effort: str | None,
    *,
    resolved_binary: str | None,
) -> tuple[str | None, str | None]:
    normalized = str(reasoning_effort or "").strip()
    if not normalized:
        return None, None
    if normalized.lower() != "xhigh":
        return normalized, None

    version = codex_cli_version(str(resolved_binary or ""))
    if version is None or version >= _MIN_XHIGH_SUPPORTED_VERSION:
        return normalized, None

    version_text = format_codex_cli_version(version)
    return (
        "high",
        (
            f"Codex CLI {version_text} does not support `xhigh`; "
            "DeepScientist downgraded reasoning effort to `high` automatically."
        ),
    )


def adapt_profile_only_provider_config(
    config_text: str,
    *,
    profile: str,
) -> tuple[str, str | None]:
    normalized_profile = str(profile or "").strip()
    if not normalized_profile or not str(config_text or "").strip():
        return config_text, None
    try:
        parsed = tomllib.loads(config_text)
    except tomllib.TOMLDecodeError:
        return config_text, None

    profiles = parsed.get("profiles")
    if not isinstance(profiles, dict):
        return config_text, None
    profile_payload = profiles.get(normalized_profile)
    if not isinstance(profile_payload, dict):
        return config_text, None

    profile_model_provider = str(profile_payload.get("model_provider") or "").strip()
    profile_model = str(profile_payload.get("model") or "").strip()
    top_level_model_provider = str(parsed.get("model_provider") or "").strip()
    top_level_model = str(parsed.get("model") or "").strip()

    root_lines: list[str] = []
    changed_fields: list[str] = []
    conflicted_fields: list[str] = []
    if profile_model_provider and top_level_model_provider != profile_model_provider:
        root_lines.append(f"model_provider = {json.dumps(profile_model_provider, ensure_ascii=False)}")
        changed_fields.append("model_provider")
        if top_level_model_provider:
            conflicted_fields.append("model_provider")
    elif profile_model_provider:
        root_lines.append(f"model_provider = {json.dumps(profile_model_provider, ensure_ascii=False)}")
    if profile_model and top_level_model != profile_model:
        root_lines.append(f"model = {json.dumps(profile_model, ensure_ascii=False)}")
        changed_fields.append("model")
        if top_level_model:
            conflicted_fields.append("model")
    elif profile_model:
        root_lines.append(f"model = {json.dumps(profile_model, ensure_ascii=False)}")

    if not changed_fields:
        return config_text, None

    root_prefix, body_lines = _split_root_table_lines(config_text)
    cleaned_root = _strip_root_model_assignments(root_prefix)
    adapted_lines: list[str] = [
        _COMPAT_BEGIN_MARKER,
        *root_lines,
        _COMPAT_END_MARKER,
    ]
    if cleaned_root:
        adapted_lines.append("")
        adapted_lines.extend(cleaned_root)
    if body_lines:
        adapted_lines.append("")
        adapted_lines.extend(body_lines)
    adapted = "\n".join(adapted_lines).rstrip() + "\n"
    field_text = _join_field_names(changed_fields)
    return (
        adapted,
        (
            f"DeepScientist overrode conflicting top-level {field_text} with values from profile "
            f"`{normalized_profile}` for Codex compatibility."
            if conflicted_fields
            else f"DeepScientist promoted `{normalized_profile}` profile {field_text} to the top level for Codex compatibility."
        ),
    )


def _find_section_bounds(lines: list[str], section_name: str) -> tuple[int | None, int | None]:
    header = f"[{section_name}]"
    start: int | None = None
    end: int | None = None

    for index, line in enumerate(lines):
        if line.strip() == header:
            start = index
            break

    if start is None:
        return None, None

    end = len(lines)
    for index in range(start + 1, len(lines)):
        if _ROOT_TABLE_SECTION_PATTERN.match(lines[index]):
            end = index
            break
    return start, end


def _upsert_boolean_in_section(lines: list[str], section_name: str, key: str, value: bool) -> tuple[list[str], bool]:
    start, end = _find_section_bounds(lines, section_name)
    rendered = f"{key} = {str(value).lower()}"
    if start is None or end is None:
        if lines and lines[-1].strip():
            lines = [*lines, ""]
        return [*lines, f"[{section_name}]", rendered], True

    key_pattern = re.compile(rf"^\s*{re.escape(key)}\s*=")
    for index in range(start + 1, end):
        if key_pattern.match(lines[index]):
            if lines[index].strip() == rendered:
                return lines, False
            updated = list(lines)
            updated[index] = rendered
            return updated, True

    updated = list(lines)
    updated.insert(end, rendered)
    return updated, True


def provider_base_url_is_official_openai(base_url: str | None) -> bool:
    normalized = str(base_url or "").strip()
    if not normalized:
        return False
    parsed = urlparse(normalized)
    hostname = str(parsed.hostname or "").strip().lower()
    return hostname in _OFFICIAL_OPENAI_HOSTS


def adapt_responses_websocket_config(
    config_text: str,
    *,
    profile: str | None = None,
) -> tuple[str, str | None]:
    metadata = active_provider_metadata(config_text, profile=profile)
    provider_name = str(metadata.get("provider") or "").strip()
    wire_api = str(metadata.get("wire_api") or "").strip().lower()
    base_url = str(metadata.get("base_url") or "").strip()
    if not provider_name or wire_api != "responses" or not base_url:
        return config_text, None
    if provider_base_url_is_official_openai(base_url):
        return config_text, None

    updated_lines = str(config_text or "").splitlines()
    changed = False

    updated_lines, provider_changed = _upsert_boolean_in_section(
        updated_lines,
        f"model_providers.{provider_name}",
        "supports_websockets",
        False,
    )
    changed = changed or provider_changed

    updated_lines, feature_changed = _upsert_boolean_in_section(
        updated_lines,
        "features",
        "responses_websockets_v2",
        False,
    )
    changed = changed or feature_changed

    if not changed:
        return config_text, None

    return (
        "\n".join(updated_lines).rstrip() + "\n",
        (
            "DeepScientist disabled Codex websocket streaming for the active responses provider "
            f"`{provider_name}` because its base_url `{base_url}` is not the official OpenAI endpoint."
        ),
    )


def _remove_tree_path(path: Path) -> None:
    if not path.exists() and not path.is_symlink():
        return
    if path.is_symlink() or path.is_file():
        path.unlink()
        return
    shutil.rmtree(path)


def _overlay_file_sources(*roots: Path) -> dict[Path, Path]:
    merged: dict[Path, Path] = {}
    for root in roots:
        if not root.exists() or not root.is_dir():
            continue
        for source_path in sorted(root.rglob("*")):
            if not source_path.is_file():
                continue
            merged[source_path.relative_to(root)] = source_path
    return merged


def _sync_overlay_directory(target_dir: Path, *source_dirs: Path) -> None:
    desired_files = _overlay_file_sources(*source_dirs)
    if not desired_files:
        _remove_tree_path(target_dir)
        return

    desired_dirs: set[Path] = {Path(".")}
    for relative in desired_files:
        parent = relative.parent
        while True:
            desired_dirs.add(parent)
            if parent == Path("."):
                break
            parent = parent.parent

    if target_dir.exists() or target_dir.is_symlink():
        for existing_path in sorted(target_dir.rglob("*"), reverse=True):
            relative = existing_path.relative_to(target_dir)
            if existing_path.is_dir() and not existing_path.is_symlink():
                if relative not in desired_dirs:
                    shutil.rmtree(existing_path)
                continue
            if relative not in desired_files:
                existing_path.unlink()

    ensure_dir(target_dir)
    for relative in sorted(desired_dirs, key=lambda item: (len(item.parts), item.as_posix())):
        if relative == Path("."):
            continue
        current = target_dir / relative
        if current.exists() and (current.is_symlink() or current.is_file()):
            current.unlink()
        ensure_dir(current)

    for relative, source_path in desired_files.items():
        target_path = target_dir / relative
        if target_path.exists() and target_path.is_dir() and not target_path.is_symlink():
            shutil.rmtree(target_path)
        ensure_dir(target_path.parent)
        try:
            same_path = source_path.resolve() == target_path.resolve()
        except FileNotFoundError:
            same_path = False
        if same_path:
            continue
        shutil.copy2(source_path, target_path)


def materialize_codex_runtime_home(
    *,
    source_home: str | Path,
    target_home: str | Path,
    profile: str = "",
    quest_codex_root: str | Path | None = None,
) -> str | None:
    source_root = Path(source_home).expanduser()
    target_root = ensure_dir(Path(target_home))

    for filename in _CODEX_HOME_SYNCED_FILES:
        source_path = source_root / filename
        target_path = target_root / filename
        if not source_path.exists():
            _remove_tree_path(target_path)
            continue
        if target_path.exists() and target_path.is_dir() and not target_path.is_symlink():
            shutil.rmtree(target_path)
        ensure_dir(target_path.parent)
        try:
            same_path = source_path.resolve() == target_path.resolve()
        except FileNotFoundError:
            same_path = False
        if not same_path:
            shutil.copy2(source_path, target_path)

    overlay_root = Path(quest_codex_root) if quest_codex_root is not None else None
    for dirname in _CODEX_HOME_SYNCED_DIRS:
        overlay_dir = overlay_root / dirname if overlay_root is not None and dirname in _CODEX_HOME_QUEST_OVERLAY_DIRS else None
        source_dirs: list[Path] = [source_root / dirname]
        if overlay_dir is not None:
            source_dirs.append(overlay_dir)
        _sync_overlay_directory(target_root / dirname, *source_dirs)

    warnings: list[str] = []
    config_path = target_root / "config.toml"
    if config_path.exists():
        config_text = read_text(config_path)
        if profile:
            config_text, warning = adapt_profile_only_provider_config(config_text, profile=profile)
            if warning:
                warnings.append(warning)
        config_text, websocket_warning = adapt_responses_websocket_config(config_text, profile=profile or None)
        if websocket_warning:
            warnings.append(websocket_warning)
        write_text(config_path, config_text)
    return " ".join(warnings) if warnings else None


def _empty_provider_metadata() -> dict[str, str | bool | None]:
    return {
        "provider": None,
        "model": None,
        "env_key": None,
        "base_url": None,
        "wire_api": None,
        "requires_openai_auth": None,
    }


def active_provider_metadata(
    config_text: str,
    *,
    profile: str | None = None,
) -> dict[str, str | bool | None]:
    normalized_profile = str(profile or "").strip()
    if not str(config_text or "").strip():
        return _empty_provider_metadata()
    try:
        parsed = tomllib.loads(config_text)
    except tomllib.TOMLDecodeError:
        return _empty_provider_metadata()

    profile_payload: dict | None = None
    if normalized_profile:
        profiles = parsed.get("profiles")
        if not isinstance(profiles, dict):
            return _empty_provider_metadata()
        candidate_profile = profiles.get(normalized_profile)
        if not isinstance(candidate_profile, dict):
            return _empty_provider_metadata()
        profile_payload = candidate_profile

    model_provider = str(
        (profile_payload or {}).get("model_provider")
        or parsed.get("model_provider")
        or ""
    ).strip() or None
    model = str(
        (profile_payload or {}).get("model")
        or parsed.get("model")
        or ""
    ).strip() or None
    provider_payload = None
    model_providers = parsed.get("model_providers")
    if model_provider and isinstance(model_providers, dict):
        candidate = model_providers.get(model_provider)
        if isinstance(candidate, dict):
            provider_payload = candidate

    env_key = (
        str(provider_payload.get("env_key") or "").strip()
        if isinstance(provider_payload, dict)
        else None
    ) or None
    base_url = (
        str(provider_payload.get("base_url") or "").strip()
        if isinstance(provider_payload, dict)
        else None
    ) or None
    wire_api = (
        str(provider_payload.get("wire_api") or "").strip()
        if isinstance(provider_payload, dict)
        else None
    ) or None
    requires_openai_auth = (
        bool(provider_payload.get("requires_openai_auth"))
        if isinstance(provider_payload, dict) and "requires_openai_auth" in provider_payload
        else None
    )

    return {
        "provider": model_provider,
        "model": model,
        "env_key": env_key,
        "base_url": base_url,
        "wire_api": wire_api,
        "requires_openai_auth": requires_openai_auth,
    }


def provider_profile_metadata(
    config_text: str,
    *,
    profile: str,
) -> dict[str, str | bool | None]:
    normalized_profile = str(profile or "").strip()
    if not normalized_profile:
        return _empty_provider_metadata()
    return active_provider_metadata(config_text, profile=normalized_profile)


def provider_profile_metadata_from_home(
    config_home: str | Path,
    *,
    profile: str,
) -> dict[str, str | bool | None]:
    config_path = Path(config_home).expanduser() / "config.toml"
    if not config_path.exists():
        return _empty_provider_metadata()
    return provider_profile_metadata(config_path.read_text(encoding="utf-8"), profile=profile)


def provider_base_url_looks_local(base_url: str | None) -> bool:
    normalized = str(base_url or "").strip()
    if not normalized:
        return False
    parsed = urlparse(normalized)
    hostname = str(parsed.hostname or "").strip().lower()
    if not hostname:
        return False
    if hostname in _LOCAL_PROVIDER_HOST_ALIASES or hostname.endswith(".local"):
        return True
    try:
        ip = ipaddress.ip_address(hostname)
    except ValueError:
        return False
    return ip.is_loopback or ip.is_private or ip.is_link_local or ip.is_unspecified


def missing_provider_env_key(
    metadata: dict[str, str | bool | None],
    env: dict[str, str] | None,
) -> str | None:
    env_key = str((metadata or {}).get("env_key") or "").strip()
    if not env_key:
        return None
    env_value = str((env or {}).get(env_key) or "").strip()
    if env_value:
        return None
    return env_key


def missing_provider_env_key_from_text(*texts: str) -> str | None:
    for text in texts:
        match = _MISSING_ENV_PATTERN.search(str(text or ""))
        if match:
            return str(match.group(1) or "").strip() or None
    return None


def active_provider_metadata_from_home(
    config_home: str | Path,
    *,
    profile: str | None = None,
) -> dict[str, str | bool | None]:
    config_path = Path(config_home).expanduser() / "config.toml"
    if not config_path.exists():
        return _empty_provider_metadata()
    return active_provider_metadata(config_path.read_text(encoding="utf-8"), profile=profile)
