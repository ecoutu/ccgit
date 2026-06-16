# 1.0.0 (2026-06-16)


### Bug Fixes

* address final review (symlink capture, scan-all-before-write, friendly errors, drift warning, backup path, dev typecheck) ([0ebf2d1](https://github.com/ecoutu/ccgit/commit/0ebf2d172c385c13c309ae7a6ac48494be3be219))
* non-interactive init declines unknowns instead of hanging on no TTY ([25b9dfa](https://github.com/ecoutu/ccgit/commit/25b9dfacdf1e6ab7bd64268210ea3db9c7935aba))
* reduce entropy false-positives on URLs/paths; dedup findings; add precedence and array-merge tests ([80cd532](https://github.com/ecoutu/ccgit/commit/80cd532524ed447bd716fa01814500764c2fbcd6))


### Features

* apply command with backup, write/symlink, merge ([db2b417](https://github.com/ecoutu/ccgit/commit/db2b4172e67c74d5a3240d0418e841a82cce58f4))
* capture command ([2f80635](https://github.com/ecoutu/ccgit/commit/2f8063578ab0481640d95e53a7d507c3f13fd822))
* classification rules with override precedence ([82b101c](https://github.com/ecoutu/ccgit/commit/82b101c5c7f598f2cf6295736b3d7e15ffc17e39))
* CLI dispatch and staged secret scan ([dbc0383](https://github.com/ecoutu/ccgit/commit/dbc0383c2a537c8612f806f8db352143402a3d66))
* git CLI wrapper ([12b7ae8](https://github.com/ecoutu/ccgit/commit/12b7ae810502afeeb53694d14f3c17d4d5722d15))
* init command (bypass hook for tool-driven commits) ([e4abd76](https://github.com/ecoutu/ccgit/commit/e4abd76a1600ee884c65bd62ca20e6c874e2a114))
* JSON fragment extract and deep-merge ([16e95dd](https://github.com/ecoutu/ccgit/commit/16e95dd0a51596c556055295c89b43d88ceff357))
* live config directory scanner ([d87cc11](https://github.com/ecoutu/ccgit/commit/d87cc117f9f5d8ef646e6cd9269dd09dc51cbe6a))
* manifest types and TOML load/save ([3e2bf73](https://github.com/ecoutu/ccgit/commit/3e2bf738e8d8290bfdfed3a1ffeed6cd74ba4401))
* path resolution helpers ([475d177](https://github.com/ecoutu/ccgit/commit/475d17703c182236794e0005d7a200c54eb7f911))
* pre-commit hook installer ([2bce88c](https://github.com/ecoutu/ccgit/commit/2bce88c8f1425016ab64bf515108107821f924d5))
* secret content scanner ([ce9be37](https://github.com/ecoutu/ccgit/commit/ce9be37518cb6e1a52ca41610019bbb9abb9afd5))
* status command with per-entry drift detection ([a7d13d9](https://github.com/ecoutu/ccgit/commit/a7d13d9cc81edf74e9fa7c8c1ac22a8a0966a826))
* sync command ([630026e](https://github.com/ecoutu/ccgit/commit/630026e42cec334cbb67a2f67b6f3b36936a35b8))
* UI output helpers ([a4bb847](https://github.com/ecoutu/ccgit/commit/a4bb8473f001dfebeb98ced15a1b9e8ab72ae07d))
