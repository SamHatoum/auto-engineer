# @auto-engineer/frontend-checks

## 0.4.5

### Patch Changes

- Fix Playwright browser auto-installation to make the package self-contained. The package now automatically installs Chromium browser when needed using npx, eliminating the need for manual browser installation.

## 0.4.3

### Patch Changes

- version testing

## 0.4.2

### Patch Changes

- Bump versions

## 0.4.1

### Patch Changes

- Version bump to trigger builds

## 0.4.0

### Minor Changes

- [#22](https://github.com/SamHatoum/auto-engineer/pull/22) [`927b39a`](https://github.com/SamHatoum/auto-engineer/commit/927b39a2c08c0baa1942b2955a8e8015e09364d9) Thanks [@SamHatoum](https://github.com/SamHatoum)! - Some major refactorings of the directory structure

### Patch Changes

- [`f3e97e5`](https://github.com/SamHatoum/auto-engineer/commit/f3e97e563b79ca8328e802dd502e65285ec58ce9) Thanks [@SamHatoum](https://github.com/SamHatoum)! - global version bump to test release process

## 0.3.0

### Minor Changes

- [`330afa5`](https://github.com/SamHatoum/auto-engineer/commit/330afa565079e3b528d0f448d64919a8dc78d684) Thanks [@SamHatoum](https://github.com/SamHatoum)! - Fix multiple dependency issues

## 0.2.0

### Minor Changes

- [#24](https://github.com/SamHatoum/auto-engineer/pull/24) [`d4dcacd`](https://github.com/SamHatoum/auto-engineer/commit/d4dcacd18cf2217d3ac9f4354f79ab7ff2ba39a0) Thanks [@SamHatoum](https://github.com/SamHatoum)! - Making commands independent and CLI based

- [#22](https://github.com/SamHatoum/auto-engineer/pull/22) [`e39acf3`](https://github.com/SamHatoum/auto-engineer/commit/e39acf31e9051652084d0de99cf8c89b40e6531c) Thanks [@SamHatoum](https://github.com/SamHatoum)! - Some major refactorings of the directory structure

## 0.1.3

### Patch Changes

- [`8546785`](https://github.com/SamHatoum/auto-engineer/commit/8546785f5a0b7225c1bb31c962b994a0561f2469) Thanks [@SamHatoum](https://github.com/SamHatoum)! - Fix npm global installation by moving playwright to dependencies
  - Moved playwright from devDependencies to dependencies so it's available during install
  - Updated postinstall script to use npx for better compatibility

## 0.1.1

### Patch Changes

- Bump versions to fix npm publish conflicts
