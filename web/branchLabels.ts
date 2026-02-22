import * as GG from "../src/types";

export interface BranchLabel {
  name: string;
  remotes: string[];
}

export interface BranchLabels {
  heads: BranchLabel[];
  remotes: GG.GitRef[];
  tags: GG.GitRef[];
}

export function getBranchLabels(refs: GG.GitRef[]): BranchLabels {
  const heads: BranchLabel[] = [];
  const headLookup: { [name: string]: number } = {};
  const remotes: GG.GitRef[] = [];
  const tags: GG.GitRef[] = [];

  for (let i = 0; i < refs.length; i++) {
    if (refs[i].type === "head") {
      headLookup[refs[i].name] = heads.length;
      heads.push({ name: refs[i].name, remotes: [] });
    } else if (refs[i].type === "tag") {
      tags.push(refs[i]);
    } else {
      remotes.push(refs[i]);
    }
  }

  const remainingRemotes: GG.GitRef[] = [];
  for (let i = 0; i < remotes.length; i++) {
    const slashIndex = remotes[i].name.indexOf("/");
    if (slashIndex > 0) {
      const remoteName = remotes[i].name.substring(0, slashIndex);
      const branchName = remotes[i].name.substring(slashIndex + 1);
      if (typeof headLookup[branchName] === "number") {
        heads[headLookup[branchName]].remotes.push(remoteName);
        continue;
      }
    }
    remainingRemotes.push(remotes[i]);
  }

  return { heads, remotes: remainingRemotes, tags };
}
