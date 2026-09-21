[English](README.md) | [中文](README.zh-CN.md)

# CMake-Embedded

一款用于 VS Code 的 CMake 工程生成插件，支持两个**互相独立**的方向：

- **MCU 固件** —— 裸机 STM32 / GD32 工程，生成链接脚本、GNU 启动文件、工具链和 CMake。
- **Linux / SoC 应用** —— 交叉编译工程，生成工具链和 CMake，目标为龙芯(loongarch64)、ARM(aarch64) 或 RISC-V(riscv64)。

两个方向都会扫描当前打开的工程目录，收集 C/C++ 源文件、头文件目录和宏，然后生成可直接构建的 CMake 工程。

## 命令

| 命令 | 方向 | 说明 |
| --- | --- | --- |
| `CMake-Embedded: Generate MCU Project` | MCU | 选厂商 → 系列 → 型号，生成裸机工程 |
| `CMake-Embedded: Generate Linux Project` | Linux | 选交叉工具链，生成交叉编译工程 |
| `CMake-Embedded: Generate OpenOCD Flash Script` | MCU | 仅生成 `flash.py` |
| `CMake-Embedded: Generate Cortex-Debug Configuration` | MCU | 仅生成 `.vscode/launch.json` 调试配置 |

---

## MCU 方向

### 功能

- 根据当前工程目录生成 `CMakeLists.txt`
- 生成 MCU 链接脚本和 GNU 汇编启动文件
- 在 `system/` 目录生成 C 运行时支持文件
- 生成适用于 Ninja 的 Debug 和 Release 配置和构建预设
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

### 演示

![CMake-Embedded 演示](img/demo.png)

当前芯片数据库支持常用的 STM32/GD32 F1、F4 型号和 STM32L4 型号。
芯片选择列表会先按厂商分为 `STM` 和 `GD`，再按系列分为
`STMF1x`、`STMF4x`、`STML4x`、`GDF1x` 和 `GDF4x`。

### 使用方法

1. 使用 VS Code 打开 MCU 工程目录。
2. 打开命令面板，运行 `CMake-Embedded: Generate MCU Project`。
3. 按提示选择厂商、系列和型号，并在覆盖确认时进行确认。
4. 使用生成的预设配置和构建工程：

   ```powershell
   cmake --preset debug      # 或 cmake --preset release
   cmake --build --preset debug
   ```

生成 CMake 工程时，插件会询问是否同时生成 `flash.py`。如果选择生成，
会先单独选择 OpenOCD 烧录 target，再选择调试器，不会复用 CMake 构建芯片。
也可以单独运行 `CMake-Embedded: Generate OpenOCD Flash Script`。
这个命令只询问烧录 target 和调试器，然后把 `flash.py` 写入工程根目录，
不会修改用户已有的 CMake 工程。烧录 target 覆盖 STM32 F0/F1/F2/F3/F4/F7/
G0/G4/H7/L0/L1/L4/L5/U5/WB/WL 和 GD32 E23x/F1/F4/VF103 系列。

如果 OpenOCD 不在系统 `PATH` 中，可以在 VS Code 设置里配置
`CMake-Embedded: Openocd Path`（`cmakeEmbedded.openocdPath`）。
生成的脚本会把这个路径作为默认值，也可以在运行时覆盖：

```powershell
python flash.py
python flash.py --firmware build/my-project.elf
python flash.py --probe stlink
python flash.py --openocd D:\Tools\OpenOCD\bin\openocd.exe
python flash.py --dry-run
```

如果 Cortex-Debug 找不到 ARM GNU 工具链，可以在 VS Code 设置中配置
`CMake-Embedded: Arm Toolchain Path`（`cmakeEmbedded.armToolchainPath`），
填写 `arm-none-eabi` 工具所在的 `bin` 目录。生成的调试配置会使用该路径，
并设置工具链前缀为 `arm-none-eabi`。

运行 `CMake-Embedded: Generate Cortex-Debug Configuration`，即可向
`.vscode/launch.json` 添加标准 OpenOCD 调试配置。生成的配置使用
`${command:cmake.launchTargetPath}` 获取固件，因此既适用于插件生成的 CMake
工程，也适用于用户自己的 CMake 工程。已有的其他调试配置会保留。生成后
直接在 VS Code 中按 `F5` 启动 Cortex-Debug 调试。

### 生成后的目录结构

```text
<project>/
├── CMakeLists.txt
├── CMakePresets.json
├── .mcu-cmake.json
├── .vscode/
│   ├── settings.json
│   ├── c_cpp_properties.json
│   └── launch.json             （可选 Cortex-Debug 调试配置）
├── <mcu>.ld
├── startup_<device>.S
├── flash.py                    （可选 OpenOCD 烧录脚本）
├── cmake/
│   └── <device>-toolchain.cmake
└── system/
    ├── syscalls.c
    └── sysmem.c
```

构建目录为 `build/debug` 和 `build/release`。固件输出文件、map 文件和内存使用报告也会生成
在该目录下。

---

## Linux 方向

### 功能

- 根据当前工程目录生成 `CMakeLists.txt`
- 生成交叉编译工具链文件 `cmake/linux-toolchain.cmake`
- 生成 Debug 和 Release 两个 Ninja 配置/构建预设
- 生成 `.linux-cmake.json`，记录所选工具链和工程结构
- 配置 CMake Tools 使用生成的预设，并使用 CMake 编译数据库配置 IntelliSense
- 覆盖已有生成文件前进行确认

工具链文件里只写**编译器命令名**（例如 `loongarch64-linux-gnu-gcc`），
不写任何绝对路径，因此同一个工程可以在不同机器上使用。

### 支持的交叉工具链

| 名称 | 前缀 | `CMAKE_SYSTEM_PROCESSOR` |
| --- | --- | --- |
| 龙芯 (loongarch64) | `loongarch64-linux-gnu-` | `loongarch64` |
| ARM (aarch64) | `aarch64-linux-gnu-` | `aarch64` |
| RISC-V (riscv64) | `riscv64-linux-gnu-` | `riscv64` |

### 工具链查找

插件**没有任何关于工具链路径的设置项**，只从环境变量查找：

1. `CROSS_COMPILE`，例如 `export CROSS_COMPILE=loongarch64-linux-gnu-`
2. `CC` / `CXX`
3. `PATH` 中匹配上述前缀的 `gcc` + `g++`

选择列表永远同时给出两个选项：某一项在环境中找到了，会标注来源和所在
目录；没找到也能正常生成，只是构建前需要把工具链的 `bin` 目录加入 `PATH`。

### 使用方法

1. 使用 VS Code 打开**一个工程的根目录**（一个根目录放一个工程）。
2. 打开命令面板，运行 `CMake-Embedded: Generate Linux Project`。
3. 选择要生成的交叉工具链（龙芯、ARM 或 RISC-V），并在覆盖确认时进行确认。
4. 使用生成的预设配置和构建工程：

   ```bash
   cmake --preset debug      # 或 cmake --preset release
   cmake --build --preset debug
   ```

### 生成后的目录结构

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

构建目录为 `build/debug` 和 `build/release`。工程里已有的用户代码区
（`# CMAKE-EMBEDDED USER CODE BEGIN` 到 `END` 之间）在重新生成时会被保留，
因此可以把手写的 `target_sources`、`target_link_libraries` 等放在里面。

---

## 环境要求

- VS Code 1.85 或更高版本
- CMake Tools 插件
- C/C++ 插件
- CMake 3.22 或更高版本
- Ninja

按方向选择：

- **MCU**：Arm GNU Toolchain，并确保以下命令位于 `PATH` 中：
  `arm-none-eabi-gcc`、`arm-none-eabi-g++`、`arm-none-eabi-objcopy` 和
  `arm-none-eabi-size`；仅在生成 Cortex-Debug 调试配置时需要 Cortex-Debug 插件。
- **Linux**：交叉工具链，并确保 `loongarch64-linux-gnu-gcc`、
  `aarch64-linux-gnu-gcc` 或 `riscv64-linux-gnu-gcc`（以及对应的 `g++`）位于 `PATH` 中。

## 开发

```powershell
npm install
npm test
```

在 VS Code 中按 `F5` 启动扩展开发主机，打开工程后从命令面板运行
`CMake-Embedded: Generate MCU Project` 或 `CMake-Embedded: Generate Linux Project`。

如果要在 WSL 里调试 Linux 方向：先在 WSL 窗口中打开本插件工程再按 `F5`，
这样扩展宿主运行在 WSL 侧，才能看到 WSL 的 `PATH`。

## 项目状态

当前仓库仍处于早期插件原型阶段。芯片配置和代码模板保持较小，后续会逐步
增加更多 MCU 系列支持。
