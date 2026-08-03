const OPTION_ARG_PREFIX = "-";
const REF_SEGMENT_SEPARATOR = "/";
const REF_DOT = ".";
const REF_LOCK_SUFFIX = ".lock";
const REF_RANGE_SEQUENCE = "..";
const REF_REFLOG_SEQUENCE = "@{";
const FORBIDDEN_REF_CHARACTERS = /[~^:?*[\\]/;
const WHITESPACE_CHARACTER = /\s/;
const CONTROL_CHARACTER_MAX_CODE = 0x1f;
const DELETE_CHARACTER_CODE = 0x7f;

function isValidRefSegment(segment: string): boolean {
  return segment !== "" && !segment.startsWith(REF_DOT);
}

function containsControlCharacter(value: string): boolean {
  for (let i = 0; i < value.length; i++) {
    const code = value.charCodeAt(i);
    if (code <= CONTROL_CHARACTER_MAX_CODE || code === DELETE_CHARACTER_CODE) {
      return true;
    }
  }
  return false;
}

/**
 * Check a ref name against the Git ref rules that matter before spawning Git,
 * so that names Git would reject (or read as an option or a revision range)
 * never reach the command line.
 */
export function isValidRefName(refName: string): boolean {
  if (refName === "") {
    return false;
  }
  if (refName.startsWith(OPTION_ARG_PREFIX)) {
    return false;
  }
  if (refName.endsWith(REF_DOT) || refName.endsWith(REF_LOCK_SUFFIX)) {
    return false;
  }
  if (refName.includes(REF_RANGE_SEQUENCE) || refName.includes(REF_REFLOG_SEQUENCE)) {
    return false;
  }
  if (FORBIDDEN_REF_CHARACTERS.test(refName) || WHITESPACE_CHARACTER.test(refName)) {
    return false;
  }
  if (containsControlCharacter(refName)) {
    return false;
  }

  return refName.split(REF_SEGMENT_SEPARATOR).every(isValidRefSegment);
}

/**
 * Check the shape of a remote name only. Membership in the registered remotes
 * is verified separately against the current `git remote` output.
 */
export function isSafeRemoteName(remoteName: string): boolean {
  return remoteName !== "" && !remoteName.startsWith(OPTION_ARG_PREFIX);
}
