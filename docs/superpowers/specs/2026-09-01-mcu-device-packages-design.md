# MCU Device Package Expansion

## Goal

Expand the CMake generator from its current single GD32 profile to a small,
extensible device database covering the STM32F1, STM32F4, GD32F1, and GD32F4
families. The device database must provide enough information for CMake,
the linker script, and the generated GNU startup file without coupling the
generator to a particular vendor project format.

The first implementation will keep the existing `GD32F103C8T6` profile and
add representative STM32F1, STM32F4, and GD32F4 profiles. Exact memory sizes,
startup vectors, compiler flags, and vendor defines must be verified for each
concrete part before it is exposed in the selection list.

## Non-goals

- Do not implement Keil, IAR, or Eclipse project parsing.
- Do not implement chip auto-detection or probe communication.
- Do not add flashing or debugging functionality; EmberProbe remains the
  separate flashing and debugging tool.
- Do not copy EmberProbe's OpenOCD runtime or hardware access implementation.
- Do not generate vendor SDK source files or peripheral libraries.

## Device Model

`DeviceProfile` remains the public model used by the generators. It will be
extended only with data needed by generated build files:

- vendor and family identity
- Cortex-M core and compiler flags
- preprocessor defines
- Flash and RAM memory regions
- linker script filename
- GNU startup filename
- startup interrupt handler names
- optional debug target name for future interoperability with EmberProbe

The existing `compilerFlags` field will carry architecture and floating-point
flags. This keeps toolchain generation generic while allowing Cortex-M3 and
Cortex-M4 profiles to select different instruction sets and ABI settings.

Profiles will be grouped by family in source modules, while
`deviceProfiles.ts` will expose one normalized registry to the extension.
Adding a part must not require changes to the extension command flow.

## Startup Generation

The startup generator currently embeds the GD32F10x interrupt vector list.
That list will move into the device profile data. The generator will continue
to own the common GNU assembly structure:

1. vector table and weak aliases
2. reset handler
3. data copy and BSS clearing
4. `SystemInit`, `__libc_init_array`, and `main` calls
5. default interrupt handler

Each family profile will supply only its vector handler names and CPU
directive. This prevents STM32 and GD32 interrupt names from being mixed in a
single generated startup file.

## Linker and Toolchain Generation

The linker generator will continue to derive the basic `FLASH` and `RAM`
regions from the profile and retain the existing non-RWX section layout,
heap/stack assertions, and map-file generation.

The toolchain generator will use the profile flags for:

- compiler and assembler architecture selection
- Thumb mode
- optional Cortex-M4 floating-point ABI settings
- section garbage collection and map output
- Debug/Release optimization settings

If a device has multiple usable RAM banks, the profile schema must represent
those regions explicitly before that device is added. Silently treating an
additional memory bank as ordinary contiguous RAM is not acceptable.

## Initial Profiles

The initial registry will cover these representative parts:

- `GD32F103C8T6` as the existing GD32F1 profile
- one concrete STM32F1 part compatible with the medium-density F1 startup
  vector table
- one concrete STM32F4 part with verified Flash/RAM layout and FPU flags
- one concrete GD32F4 part with verified Flash/RAM layout and FPU flags

The exact part names and memory values will be checked against vendor startup
files and device documentation during implementation. The profile names used
by EmberProbe/OpenOCD may be stored as metadata, but they will not control
CMake generation.

## Generation Flow

The existing command flow stays unchanged:

1. the user runs the generate command
2. the extension lists profiles from the device registry
3. the selected profile is passed to all generators
4. generated files are written after overwrite confirmation

Generated files continue to be placed as follows:

```text
<project>/
├── CMakeLists.txt
├── CMakePresets.json
├── <device>.ld
├── startup_<family>.S
├── cmake/
│   └── <device>-toolchain.cmake
└── system/
    ├── syscalls.c
    └── sysmem.c
```

## Error Handling

- An unknown part must continue to produce an explicit `Unsupported MCU`
  error.
- A profile with an empty vector table, memory region, or compiler flag list
  must fail validation before it is shown to the user.
- Existing generated files must continue to use the current overwrite prompt.
- Unsupported or incomplete profiles must not silently fall back to the
  existing GD32 profile.

## Testing

Add tests for:

- registry lookup and case normalization for every initial part
- profile memory, defines, core, and compiler flags
- family-specific startup vectors and absence of unrelated vendor handlers
- generated linker script memory regions and overflow assertion
- generated toolchain architecture/FPU flags
- generated CMake source and generated filename selection
- unsupported part and invalid profile validation

Keep the existing minimal firmware configure/build test and run the generated
GD32 project through CMake after the profile changes. The STM32 and GD32F4
profiles should at least be validated through compiler and assembler checks;
full vendor SDK builds are outside this repository's test fixture.

## Reference Use

EmberProbe-MCU-Flash-Debug is a reference for family naming, OpenOCD target
names, and hardware identity information. Its runtime implementation is not
part of this design. Any directly reused source code must retain the original
MIT license notice.
