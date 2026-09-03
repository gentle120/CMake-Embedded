# Industrial MCU Profiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the agreed industrial STM32 and GD32 MCU variants with verified build metadata so project generation emits the correct compiler definitions, linker memory map, and GNU startup vector table.

**Architecture:** Keep the existing `DeviceProfile` registry and generators unchanged at the public interface. Make the family profile helpers accept the device-specific values that currently differ, then register each concrete part in its existing vendor/family module. The startup generator remains generic and consumes only the selected profile's interrupt list.

**Tech Stack:** TypeScript, Node.js built-in test runner, ARM GNU toolchain, CMake, Ninja.

**Spec:** `docs/superpowers/specs/2026-09-01-mcu-device-packages-design.md`

## Global Constraints

- Only add the user-approved parts: `GD32F407ZGT6`, `STM32F103RCT6`, `STM32F103ZET6`, `GD32F103RCT6`, `STM32F429ZIT6`, and `STM32L476RGT6`.
- Preserve the independent OpenOCD flash/debug selection flow.
- Do not generate vendor SDK source files or peripheral libraries.
- Keep all source comments in English.
- Do not silently reuse a profile when the startup vector table or memory layout differs.

---

### Task 1: Add red tests for the new device metadata

**Files:**
- Modify: `src/test/deviceProfile.test.ts`
- Modify: `src/test/startupGenerator.test.ts`
- Modify: `src/test/linkerGenerator.test.ts`
- Modify: `src/test/cmakeBuild.test.ts`

- [x] Extend the registry list expectation with all six new parts.
- [x] Add assertions for each new part's family, core, flash size, RAM size, vendor define, startup filename, and relevant additional memory.
- [x] Add startup assertions proving high-density F1, F429, L476, and GD32F4 vector handlers are selected without unrelated vendor handlers.
- [x] Add linker assertions for 256K/512K/2M flash and the appropriate RAM/CCM/TCRAM regions.
- [x] Add the new parts to the minimal generated CMake build matrix.
- [x] Run the focused tests and confirm they fail because the profiles do not exist or still use the old fixed helper values.

### Task 2: Generalize family profile helper data

**Files:**
- Modify: `src/devices/stm32/common.ts`
- Modify: `src/devices/gd32/common.ts`

- [x] Add optional, explicit helper arguments or small configuration objects for defines, RAM length, startup filename, and interrupt handlers.
- [x] Preserve current defaults for existing profiles so existing generated projects remain byte-compatible where the data is unchanged.
- [x] Add the STM32F429 vector list and STM32 high-density F1 vector list from the local vendor startup references.
- [x] Add the STM32L4 vector data needed by L476 while retaining the existing L496 behavior.
- [x] Add the GD32 high-density F1 vector list and retain the existing GD32F4 list for F407/F450 variants.

### Task 3: Register concrete profiles

**Files:**
- Create: `src/devices/stm32/stm32f1xx/STM32F103RCT6.ts`
- Create: `src/devices/stm32/stm32f1xx/STM32F103ZET6.ts`
- Create: `src/devices/stm32/stm32f4xx/STM32F429ZIT6.ts`
- Create: `src/devices/stm32/stm32l4xx/STM32L476RGT6.ts`
- Create: `src/devices/gd32/gd32f1xx/GD32F103RCT6.ts`
- Create: `src/devices/gd32/gd32f4xx/GD32F407ZGT6.ts`
- Modify: `src/devices/stm32/stm32f1xx/index.ts`
- Modify: `src/devices/stm32/stm32f4xx/index.ts`
- Modify: `src/devices/stm32/stm32l4xx/index.ts`
- Modify: `src/devices/gd32/gd32f1xx/index.ts`
- Modify: `src/devices/gd32/gd32f4xx/index.ts`

- [x] Define exact memory lengths and compiler macros for every new part.
- [x] Select high-density startup filenames for the F1 parts, `startup_stm32f429xx.S` for F429, `startup_stm32l476xx.S` for L476, and `startup_gd32f407_427.S` for GD32F407ZGT6.
- [x] Register every profile in the correct family index without changing selection ordering rules.

### Task 4: Run focused and full verification

**Files:**
- Verify: generated output only in temporary test directories.

- [x] Run the focused device, startup, linker, and CMake tests.
- [x] Run `npm test` and record the complete pass/fail count: 67/67.
- [x] Confirm TypeScript compilation emits no errors.
- [x] Confirm every generated profile in the CMake build matrix configures and links with the locally available ARM GNU toolchain.
- [x] Review the final diff and confirm no unrelated files were changed.
