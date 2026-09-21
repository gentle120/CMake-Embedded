[English](README.md) | [中文](README.zh-CN.md)

# CMake-Embedded

A VS Code extension that generates ready-to-build CMake projects for two
**independent** targets:

- **MCU firmware** - bare-metal STM32 / GD32 projects with a linker script, a GNU
  startup file, a toolchain file, and CMake.
- **Linux / SoC applications** - cross compilation projects for Loongson
  (loongarch64), ARM (aarch64), 32-bit ARM (armv7 hard-float), or RISC-V
  (riscv64), with a toolchain file and CMake.

Both directions scan the opened workspace for C/C++ sources, header directories,
and preprocessor definitions, then generate the files needed to build.

## Commands

| Command | Direction | Purpose |
| --- | --- | --- |
| `CMake-Embedded: Generate MCU Project` | MCU | Pick vendor, series, and part, then generate a bare-metal project |
| `CMake-Embedded: Generate Linux Project` | Linux | Pick the cross toolchain, then generate a cross compilation project |
| `CMake-Embedded: Generate OpenOCD Flash Script` | MCU | Generate `flash.py` only |
| `CMake-Embedded: Generate Cortex-Debug Configuration` | MCU | Generate a `.vscode/launch.json` debug configuration only |

---

## MCU direction

### Features

- Generate `CMakeLists.txt` from the current project directory
- Generate an MCU linker script and GNU assembler startup file
- Generate the C runtime support files under `system/`
- Generate Debug and Release configure and build presets for Ninja
- Configure CMake Tools to use the generated presets
- Configure C/C++ IntelliSense from the CMake compile database
- Generate an optional OpenOCD `flash.py` script independently from CMake
- Generate a Cortex-Debug OpenOCD launch configuration
- Generate `.elf`, `.hex`, and `.bin` files after a successful build
- Prompt before overwriting generated files

The flash script supports J-Link OB, J-Link, ST-Link, and DapLink. The CMake
device selection and OpenOCD flash-target selection are independent, so a
project can use a custom CMake build and still generate a flash script. The
probe selection provides the OpenOCD interface configuration. GD32 F1/F4
targets use the compatible STM32 F1/F4 OpenOCD targets.

### Demo

![CMake-Embedded Demo](img/demo.png)

The device database currently includes common STM32/GD32 F1 and F4 parts plus
the STM32L4 family. The device picker groups them by vendor first (`STM` or
`GD`), then by series (`STMF1x`, `STMF4x`, `STML4x`, `GDF1x`, or `GDF4x`).

### Usage

1. Open the MCU project folder in VS Code.
2. Open the Command Palette and run `CMake-Embedded: Generate MCU Project`.
3. Pick the vendor, series, and part, then confirm the generated files when asked.
4. Configure and build the project with the generated presets:

   ```powershell
   cmake --preset debug      # or cmake --preset release
   cmake --build --preset debug
   ```

The project generator asks whether `flash.py` should also be generated. If
selected, it asks for an OpenOCD flash target and probe separately from the
CMake build device. You can also run `CMake-Embedded: Generate OpenOCD Flash
Script` by itself. This command asks only for the flash target and debug probe,
then writes `flash.py` in the project root without changing an existing CMake
project. The flash target database includes STM32 F0/F1/F2/F3/F4/F7/G0/G4/H7/
L0/L1/L4/L5/U5/WB/WL families and GD32 E23x/F1/F4/VF103 targets.

Set `CMake-Embedded: Openocd Path` (`cmakeEmbedded.openocdPath`) in VS Code
settings when OpenOCD is not available in `PATH`. The generated script stores
that value as its default and accepts an override when needed:

```powershell
python flash.py
python flash.py --firmware build/my-project.elf
python flash.py --probe stlink
python flash.py --openocd D:\Tools\OpenOCD\bin\openocd.exe
python flash.py --dry-run
```

If Cortex-Debug cannot find the ARM GNU toolchain, set `CMake-Embedded: Arm
Toolchain Path` (`cmakeEmbedded.armToolchainPath`) to the `bin` directory
containing the `arm-none-eabi` tools. The generated debug configuration uses
this path and sets the toolchain prefix to `arm-none-eabi`.

Run `CMake-Embedded: Generate Cortex-Debug Configuration` to add a standard
OpenOCD launch configuration to `.vscode/launch.json`. The generated entry
uses `${command:cmake.launchTargetPath}` for the firmware, so it works with
the generated CMake project and with a user-provided CMake project. Existing
launch configurations are preserved. Press `F5` in VS Code to start the
Cortex-Debug session.

### Generated layout

```text
<project>/
├── CMakeLists.txt
├── CMakePresets.json
├── .mcu-cmake.json
├── .vscode/
│   ├── settings.json
│   ├── c_cpp_properties.json
│   └── launch.json             (optional Cortex-Debug configuration)
├── <mcu>.ld
├── startup_<device>.S
├── flash.py                    (optional OpenOCD flash script)
├── cmake/
│   └── <device>-toolchain.cmake
└── system/
    ├── syscalls.c
    └── sysmem.c
```

The build directories are `build/debug` and `build/release`. Firmware output files are generated
there together with the map file and memory usage report.

---

## Linux direction

### Features

- Generate `CMakeLists.txt` from the current project directory
- Generate the cross toolchain file `cmake/linux-toolchain.cmake`
- Generate Debug and Release Ninja configure and build presets
- Generate `.linux-cmake.json`, recording the selected toolchain and project structure
- Configure CMake Tools to use the generated presets and C/C++ IntelliSense from
  the CMake compile database
- Prompt before overwriting generated files

The toolchain file only contains **compiler command names** (for example
`loongarch64-linux-gnu-gcc`), never absolute paths, so the same project builds on
any machine.

### Supported cross toolchains

| Name | Prefix | `CMAKE_SYSTEM_PROCESSOR` |
| --- | --- | --- |
| Loongson (loongarch64) | `loongarch64-linux-gnu-` | `loongarch64` |
| ARM (aarch64) | `aarch64-linux-gnu-` | `aarch64` |
| ARM 32-bit (armv7 hard-float) | `arm-linux-gnueabihf-` | `arm` |
| RISC-V (riscv64) | `riscv64-linux-gnu-` | `riscv64` |

### Toolchain lookup

There are **no extension settings for toolchain paths**. The toolchain is located
through the environment only:

1. `CROSS_COMPILE`, for example `export CROSS_COMPILE=loongarch64-linux-gnu-`
2. `CC` / `CXX`
3. `PATH`, matching a supported `gcc` + `g++` prefix pair

All four families are always offered in the picker. An entry that was found in
the environment is annotated with its source and directory; an entry that was not
found can still be generated, and only requires the toolchain `bin` directory on
`PATH` before building.

### Usage

1. Open **one project root folder** in VS Code (one project per root).
2. Open the Command Palette and run `CMake-Embedded: Generate Linux Project`.
3. Pick the cross toolchain (Loongson, ARM aarch64, ARM 32-bit, or RISC-V) and confirm the generated files.
4. Configure and build the project with the generated presets:

   ```bash
   cmake --preset debug      # or cmake --preset release
   cmake --build --preset debug
   ```

### Generated layout

```text
<project>/
├── CMakeLists.txt
├── CMakePresets.json
├── .linux-cmake.json
├── .vscode/
│   ├── settings.json
│   └── c_cpp_properties.json
└── cmake/
    └── linux-toolchain.cmake
```

The build directories are `build/debug` and `build/release`. The user code
section of an existing `CMakeLists.txt` (between `# CMAKE-EMBEDDED USER CODE
BEGIN` and `END`) is preserved when regenerating, so hand-written
`target_sources`, `target_link_libraries`, and similar blocks survive.

---

## Requirements

- VS Code 1.85 or newer
- CMake Tools extension
- C/C++ extension
- CMake 3.22 or newer
- Ninja

Depending on the direction:

- **MCU**: Arm GNU Toolchain with `arm-none-eabi-gcc`, `arm-none-eabi-g++`,
  `arm-none-eabi-objcopy`, and `arm-none-eabi-size` available in `PATH`. The
  Cortex-Debug extension is only needed to generate a debug configuration.
- **Linux**: a cross toolchain with `loongarch64-linux-gnu-gcc`,
  `aarch64-linux-gnu-gcc`, `arm-linux-gnueabihf-gcc`, or `riscv64-linux-gnu-gcc`
  (and the matching `g++`) available in `PATH`.

## Development

```powershell
npm install
npm test
```

Press `F5` in VS Code to launch an Extension Development Host, open a project,
and run `CMake-Embedded: Generate MCU Project` or `CMake-Embedded: Generate
Linux Project` from the Command Palette.

To debug the Linux direction inside WSL, open this extension project in a WSL
window first and press `F5` there, so the extension host runs on the WSL side
and sees the WSL `PATH`.

## Project Status

This repository is an early extension prototype. Device profiles and generated
templates are intentionally kept small so more MCU families can be added
incrementally.
