[English](README.md) | [中文](README.zh-CN.md)

# MCU CMake Generator

一款用于 VS Code 的 MCU CMake 工程生成插件，帮助裸机 MCU 项目快速生成
可构建的 CMake 工程文件。

插件会扫描当前打开的工程目录，收集 C/C++ 源文件、头文件目录和预处理宏，
然后生成基于 `arm-none-eabi-gcc` 的 CMake 构建配置。

## 功能

- 根据当前工程目录生成 `CMakeLists.txt`
- 生成 MCU 链接脚本和 GNU 汇编启动文件
- 在 `system/` 目录生成 C 运行时支持文件
- 生成适用于 Ninja 的 Debug 配置和构建预设
- 构建成功后生成 `.elf`、`.hex` 和 `.bin` 文件
- 覆盖已有生成文件前进行确认

## 环境要求

- VS Code 1.85 或更高版本
- CMake 3.22 或更高版本
- Ninja
- Arm GNU Toolchain，并确保以下命令位于 `PATH` 中：
  `arm-none-eabi-gcc`、`arm-none-eabi-g++`、`arm-none-eabi-objcopy` 和
  `arm-none-eabi-size`

## 使用方法

1. 使用 VS Code 打开 MCU 工程目录。
2. 打开命令面板，运行 `MCU CMake: Generate Project`。
3. 按照提示完成配置，并在覆盖确认时进行确认。
4. 使用生成的预设配置和构建工程：

   ```powershell
   cmake --preset debug
   cmake --build --preset debug
   ```

构建目录为 `build/debug`。固件输出文件、map 文件和内存使用报告也会生成
在该目录下。

## 生成后的目录结构

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

生成的文件都是普通工程文件。对于需要自定义内存预留、启动流程或编译选项
的项目，可以在生成后直接检查和修改这些文件。

## 开发

```powershell
npm install
npm test
```

在 VS Code 中按 `F5` 启动扩展开发主机，打开 MCU 工程后，从命令面板运行
`MCU CMake: Generate Project`。

## 项目状态

当前仓库仍处于早期插件原型阶段。芯片配置和代码模板保持较小，后续会逐步
增加更多 MCU 系列支持。
