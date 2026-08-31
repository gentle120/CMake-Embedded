[English](README.md) | [中文](README.zh-CN.md)

# MCU CMake Generator

Generate a ready-to-build CMake project for bare-metal MCU firmware directly
from VS Code.

The extension scans the opened workspace for C/C++ sources, headers, and
preprocessor definitions, then generates the CMake files needed for an
`arm-none-eabi-gcc` build.

## Features

- Generate `CMakeLists.txt` from the current project directory
- Generate an MCU linker script and GNU assembler startup file
- Generate the C runtime support files under `system/`
- Generate Debug configure and build presets for Ninja
- Generate `.elf`, `.hex`, and `.bin` files after a successful build
- Prompt before overwriting generated files

## Requirements

- VS Code 1.85 or newer
- CMake 3.22 or newer
- Ninja
- Arm GNU Toolchain with these commands available in `PATH`:
  `arm-none-eabi-gcc`, `arm-none-eabi-g++`, `arm-none-eabi-objcopy`, and
  `arm-none-eabi-size`

## Usage

1. Open the MCU project folder in VS Code.
2. Open the Command Palette and run `MCU CMake: Generate Project`.
3. Follow the prompts and confirm the generated files when asked.
4. Configure and build the project with the generated presets:

   ```powershell
   cmake --preset debug
   cmake --build --preset debug
   ```

The build directory is `build/debug`. Firmware output files are generated
there together with the map file and memory usage report.

## Generated Layout

```text
<project>/
├── CMakeLists.txt
├── CMakePresets.json
├── <mcu>.ld
├── startup_<device>.S
├── cmake/
│   └── <device>-toolchain.cmake
└── system/
    ├── syscalls.c
    └── sysmem.c
```

The generated files are regular project files and can be reviewed or edited
after generation when the project needs custom memory reservations, startup
behavior, or build settings.

## Development

```powershell
npm install
npm test
```

Press `F5` in VS Code to launch an Extension Development Host, open an MCU
workspace, and run `MCU CMake: Generate Project` from the Command Palette.

## Project Status

This repository is an early extension prototype. Device profiles and generated
templates are intentionally kept small so more MCU families can be added
incrementally.
