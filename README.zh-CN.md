[English](README.md) | [中文](README.zh-CN.md)

# CMake-Embedded

一款用于 VS Code 的 MCU CMake 工程生成插件，帮助裸机 MCU 项目快速生成
可构建的 CMake 工程文件。

插件会扫描当前打开的工程目录，收集 C/C++ 源文件、头文件目录和预处理宏，
然后生成基于 `arm-none-eabi-gcc` 的 CMake 构建配置。

## 功能

- 根据当前工程目录生成 `CMakeLists.txt`
- 生成 MCU 链接脚本和 GNU 汇编启动文件
- 在 `system/` 目录生成 C 运行时支持文件
- 生成适用于 Ninja 的 Debug 配置和构建预设
- 配置 CMake Tools 使用生成的工程预设
- 使用 CMake 编译数据库配置 C/C++ 插件的 IntelliSense
- 可选生成独立于 CMake 的 OpenOCD `flash.py` 烧录脚本
- 生成 Cortex-Debug 的 OpenOCD 调试配置
- 构建成功后生成 `.elf`、`.hex` 和 `.bin` 文件
- 覆盖已有生成文件前进行确认

烧录脚本支持 J-Link OB、J-Link、ST-Link 和 DapLink。CMake 构建芯片和
OpenOCD 烧录 target 独立选择，因此也可以给已有的自定义 CMake 工程生成
烧录脚本。探针选择负责提供 OpenOCD interface 配置。GD32 F1/F4 target
使用兼容的 STM32 F1/F4 OpenOCD target。

## 演示

![CMake-Embedded 演示](img/demo.png)

当前芯片数据库支持常用的 STM32/GD32 F1、F4 型号和 STM32L4 型号，包括：
`GD32F103C8T6`、`GD32F103CBT6`、`GD32F103R8T6`、`GD32F103RBT6`、
`GD32F407RGT6`、`GD32F407VGT6`、`GD32F450VGT6`、`STM32F103C8T6`、
`STM32F103CBT6`、`STM32F103R8T6`、`STM32F103RBT6`、`STM32F103VBT6`、
`STM32F405RGT6`、`STM32F407RGT6`、`STM32F407VET6`、
`STM32F407VGT6`、`STM32F407ZGT6` 和 `STM32L496VET6`。

芯片选择列表会先按厂商分为 `STM` 和 `GD`，再按系列分为
`STMF1x`、`STMF4x`、`STML4x`、`GDF1x` 和 `GDF4x`。

## 环境要求

- VS Code 1.85 或更高版本
- CMake Tools 插件
- C/C++ 插件
- Cortex-Debug 插件
- CMake 3.22 或更高版本
- Ninja
- Arm GNU Toolchain，并确保以下命令位于 `PATH` 中：
  `arm-none-eabi-gcc`、`arm-none-eabi-g++`、`arm-none-eabi-objcopy` 和
  `arm-none-eabi-size`

## 使用方法

1. 使用 VS Code 打开 MCU 工程目录。
2. 打开命令面板，运行 `CMake-Embedded: Generate Project`。
3. 按照提示完成配置，并在覆盖确认时进行确认。
4. 使用生成的预设配置和构建工程：

   ```powershell
   cmake --preset debug
   cmake --build --preset debug
   ```

生成 CMake 工程时，插件会询问是否同时生成 `flash.py`。如果选择生成，
会先单独选择 OpenOCD 烧录 target，再选择调试器，不会复用 CMake 构建芯片。
也可以单独运行命令面板中的 `CMake-Embedded: Generate OpenOCD Flash Script`。
这个命令只询问烧录 target 和调试器，然后把 `flash.py` 写入工程根目录，
不会修改用户已有的 CMake 工程。烧录 target 覆盖 STM32 F0/F1/F2/F3/F4/F7/
G0/G4/H7/L0/L1/L4/L5/U5/WB/WL 和 GD32 E23x/F1/F4/VF103 系列。

如果 OpenOCD 不在系统 `PATH` 中，可以在 VS Code 设置里配置
`CMake-Embedded: Openocd Path`。生成的脚本会把这个路径作为默认值，也可以在
运行时覆盖：

```powershell
python flash.py
python flash.py --firmware build/my-project.elf
python flash.py --probe stlink
python flash.py --openocd D:\Tools\OpenOCD\bin\openocd.exe
python flash.py --dry-run
```

如果 Cortex-Debug 找不到 ARM GNU 工具链，可以在 VS Code 设置中配置
`CMake-Embedded: Arm Toolchain Path`，填写 `arm-none-eabi` 工具所在的 `bin`
目录。生成的调试配置会使用该路径，并设置工具链前缀为 `arm-none-eabi`。

运行 `CMake-Embedded: Generate Cortex-Debug Configuration`，即可向
`.vscode/launch.json` 添加标准 OpenOCD 调试配置。生成的配置使用
`${command:cmake.launchTargetPath}` 获取固件，因此既适用于插件生成的 CMake
工程，也适用于用户自己的 CMake 工程。已有的其他调试配置会保留。生成后
直接在 VS Code 中按 `F5` 启动 Cortex-Debug 调试。

生成后，CMake Tools 会启用 CMake Presets，并在打开工作区时自动配置工程。
生成的 `debug` 配置预设和构建预设可以直接在 CMake Tools 中使用。
C/C++ 插件会从 CMake 生成的 `build/debug/compile_commands.json` 获取头文件路径、
宏定义、编译器参数和语言设置，同时启用完整 IntelliSense 引擎，使未满足条件的
`#if`/`#ifdef` 分支自动灰显，并使用 ARM GCC 工具链进行解析。
未满足条件的 `#if`/`#ifdef` 分支会由 C/C++ 插件自动灰显。

构建目录为 `build/debug`。固件输出文件、map 文件和内存使用报告也会生成
在该目录下。

## 生成后的目录结构

```text
<project>/
├── CMakeLists.txt
├── CMakePresets.json
├── .vscode/
│   ├── settings.json
│   ├── c_cpp_properties.json
│   └── launch.json             （可选 Cortex-Debug 调试配置）
├── <mcu>.ld
├── startup_<device>.S
├── flash.py                 （可选 OpenOCD 烧录脚本）
├── cmake/
│   └── <device>-toolchain.cmake
└── system/
    ├── syscalls.c
    └── sysmem.c
```

生成的文件都是普通工程文件。对于需要自定义内存预留、启动流程或编译选项
的项目，可以在生成后直接检查和修改这些文件。

## 开发

```powershell
npm install
npm test
```

在 VS Code 中按 `F5` 启动扩展开发主机，打开 MCU 工程后，从命令面板运行
`CMake-Embedded: Generate Project`。

## 项目状态

当前仓库仍处于早期插件原型阶段。芯片配置和代码模板保持较小，后续会逐步
增加更多 MCU 系列支持。
