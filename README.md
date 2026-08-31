# MCU CMake Generator

This first prototype generates a CMake build project for a selected
`GD32F103C8T6` workspace.

## Development

```powershell
npm install
npm test
```

Press `F5` in VS Code to launch an Extension Development Host, open an MCU
workspace, and run `MCU CMake: Generate Project` from the Command Palette.

The generator creates a CMake project, an `arm-none-eabi-gcc` toolchain file,
an MCU linker script, and Debug CMake presets in the selected workspace.
