#!/usr/bin/env bash
# Read-only. Output: strength<TAB>base64(path). Never prints command lines or secrets.
set +e
emit() { [ -d "$2" ] && printf '%s\t%s\n' "$1" "$(printf '%s' "$2" | base64 -w0)"; }
for procdir in /proc/[0-9]*; do
  [ -r "$procdir/cmdline" ] || continue
  command_text=$(tr '\0' ' ' < "$procdir/cmdline" 2>/dev/null)
  case "$command_text" in
    *node*agnes*|*node*agh*|*bun*agnes*|*bun*agh*)
      case "$command_text" in *daemon.mjs*)
        cwd_path=$(readlink "$procdir/cwd" 2>/dev/null)
        emit running "$cwd_path"
      ;; esac
    ;;
  esac
done
for root in "$HOME" /opt /srv /usr/local/share; do
  [ -d "$root" ] || continue
  while IFS= read -r -d '' pkg; do
    if head -c 65536 "$pkg" 2>/dev/null | grep -Eq '"name"[[:space:]]*:[[:space:]]*"(@agnes/[^\"]+|agnes-harness|agh)"'; then
      emit candidate "$(dirname "$pkg")"
    fi
  done < <(find "$root" -maxdepth 4 \( -name node_modules -o -name .git -o -name .cache \) -prune -o -name package.json -type f -print0 2>/dev/null)
done
