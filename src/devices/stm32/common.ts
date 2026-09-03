import type { DeviceProfile } from '../deviceProfiles';

export const stm32f1InterruptHandlers = [
  'WWDG_IRQHandler', 'PVD_IRQHandler', 'TAMPER_IRQHandler', 'RTC_IRQHandler',
  'FLASH_IRQHandler', 'RCC_IRQHandler', 'EXTI0_IRQHandler', 'EXTI1_IRQHandler',
  'EXTI2_IRQHandler', 'EXTI3_IRQHandler', 'EXTI4_IRQHandler', 'DMA1_Channel1_IRQHandler',
  'DMA1_Channel2_IRQHandler', 'DMA1_Channel3_IRQHandler', 'DMA1_Channel4_IRQHandler',
  'DMA1_Channel5_IRQHandler', 'DMA1_Channel6_IRQHandler', 'DMA1_Channel7_IRQHandler',
  'ADC1_2_IRQHandler', 'USB_HP_CAN1_TX_IRQHandler', 'USB_LP_CAN1_RX0_IRQHandler',
  'CAN1_RX1_IRQHandler', 'CAN1_SCE_IRQHandler', 'EXTI9_5_IRQHandler',
  'TIM1_BRK_IRQHandler', 'TIM1_UP_IRQHandler', 'TIM1_TRG_COM_IRQHandler',
  'TIM1_CC_IRQHandler', 'TIM2_IRQHandler', 'TIM3_IRQHandler', 'TIM4_IRQHandler',
  'I2C1_EV_IRQHandler', 'I2C1_ER_IRQHandler', 'I2C2_EV_IRQHandler', 'I2C2_ER_IRQHandler',
  'SPI1_IRQHandler', 'SPI2_IRQHandler', 'USART1_IRQHandler', 'USART2_IRQHandler',
  'USART3_IRQHandler', 'EXTI15_10_IRQHandler', 'RTCAlarm_IRQHandler', 'USBWakeUp_IRQHandler'
];

export const stm32f1HighDensityInterruptHandlers = [
  ...stm32f1InterruptHandlers,
  'TIM8_BRK_IRQHandler', 'TIM8_UP_IRQHandler', 'TIM8_TRG_COM_IRQHandler',
  'TIM8_CC_IRQHandler', 'ADC3_IRQHandler', 'FSMC_IRQHandler', 'SDIO_IRQHandler',
  'TIM5_IRQHandler', 'SPI3_IRQHandler', 'UART4_IRQHandler', 'UART5_IRQHandler',
  'TIM6_IRQHandler', 'TIM7_IRQHandler', 'DMA2_Channel1_IRQHandler',
  'DMA2_Channel2_IRQHandler', 'DMA2_Channel3_IRQHandler', 'DMA2_Channel4_5_IRQHandler'
];

export const stm32f4InterruptHandlers = [
  'WWDG_IRQHandler', 'PVD_IRQHandler', 'TAMP_STAMP_IRQHandler', 'RTC_WKUP_IRQHandler',
  'FLASH_IRQHandler', 'RCC_IRQHandler', 'EXTI0_IRQHandler', 'EXTI1_IRQHandler',
  'EXTI2_IRQHandler', 'EXTI3_IRQHandler', 'EXTI4_IRQHandler', 'DMA1_Stream0_IRQHandler',
  'DMA1_Stream1_IRQHandler', 'DMA1_Stream2_IRQHandler', 'DMA1_Stream3_IRQHandler',
  'DMA1_Stream4_IRQHandler', 'DMA1_Stream5_IRQHandler', 'DMA1_Stream6_IRQHandler',
  'ADC_IRQHandler', 'CAN1_TX_IRQHandler', 'CAN1_RX0_IRQHandler', 'CAN1_RX1_IRQHandler',
  'CAN1_SCE_IRQHandler', 'EXTI9_5_IRQHandler', 'TIM1_BRK_TIM9_IRQHandler',
  'TIM1_UP_TIM10_IRQHandler', 'TIM1_TRG_COM_TIM11_IRQHandler', 'TIM1_CC_IRQHandler',
  'TIM2_IRQHandler', 'TIM3_IRQHandler', 'TIM4_IRQHandler', 'I2C1_EV_IRQHandler',
  'I2C1_ER_IRQHandler', 'I2C2_EV_IRQHandler', 'I2C2_ER_IRQHandler', 'SPI1_IRQHandler',
  'SPI2_IRQHandler', 'USART1_IRQHandler', 'USART2_IRQHandler', 'USART3_IRQHandler',
  'EXTI15_10_IRQHandler', 'RTC_Alarm_IRQHandler', 'OTG_FS_WKUP_IRQHandler',
  'TIM8_BRK_TIM12_IRQHandler', 'TIM8_UP_TIM13_IRQHandler', 'TIM8_TRG_COM_TIM14_IRQHandler',
  'TIM8_CC_IRQHandler', 'DMA1_Stream7_IRQHandler', 'FSMC_IRQHandler', 'SDIO_IRQHandler',
  'TIM5_IRQHandler', 'SPI3_IRQHandler', 'UART4_IRQHandler', 'UART5_IRQHandler',
  'TIM6_DAC_IRQHandler', 'TIM7_IRQHandler', 'DMA2_Stream0_IRQHandler',
  'DMA2_Stream1_IRQHandler', 'DMA2_Stream2_IRQHandler', 'DMA2_Stream3_IRQHandler',
  'DMA2_Stream4_IRQHandler', 'ETH_IRQHandler', 'ETH_WKUP_IRQHandler', 'CAN2_TX_IRQHandler',
  'CAN2_RX0_IRQHandler', 'CAN2_RX1_IRQHandler', 'CAN2_SCE_IRQHandler', 'OTG_FS_IRQHandler',
  'DMA2_Stream5_IRQHandler', 'DMA2_Stream6_IRQHandler', 'DMA2_Stream7_IRQHandler',
  'USART6_IRQHandler', 'I2C3_EV_IRQHandler', 'I2C3_ER_IRQHandler', 'OTG_HS_EP1_OUT_IRQHandler',
  'OTG_HS_EP1_IN_IRQHandler', 'OTG_HS_WKUP_IRQHandler', 'OTG_HS_IRQHandler',
  'DCMI_IRQHandler', 'HASH_RNG_IRQHandler', 'FPU_IRQHandler'
];

export const stm32f4ExtendedInterruptHandlers = [
  ...stm32f4InterruptHandlers.slice(0, -3),
  'DCMI_IRQHandler', '0', 'HASH_RNG_IRQHandler', 'FPU_IRQHandler',
  'UART7_IRQHandler', 'UART8_IRQHandler', 'SPI4_IRQHandler', 'SPI5_IRQHandler',
  'SPI6_IRQHandler', 'SAI1_IRQHandler', 'LTDC_IRQHandler', 'LTDC_ER_IRQHandler',
  'DMA2D_IRQHandler'
];

export const stm32l4InterruptHandlers = [
  'WWDG_IRQHandler', 'PVD_PVM_IRQHandler', 'TAMP_STAMP_IRQHandler', 'RTC_WKUP_IRQHandler',
  'FLASH_IRQHandler', 'RCC_IRQHandler', 'EXTI0_IRQHandler', 'EXTI1_IRQHandler',
  'EXTI2_IRQHandler', 'EXTI3_IRQHandler', 'EXTI4_IRQHandler', 'DMA1_Channel1_IRQHandler',
  'DMA1_Channel2_IRQHandler', 'DMA1_Channel3_IRQHandler', 'DMA1_Channel4_IRQHandler',
  'DMA1_Channel5_IRQHandler', 'DMA1_Channel6_IRQHandler', 'DMA1_Channel7_IRQHandler',
  'ADC1_2_IRQHandler', 'CAN1_TX_IRQHandler', 'CAN1_RX0_IRQHandler', 'CAN1_RX1_IRQHandler',
  'CAN1_SCE_IRQHandler', 'EXTI9_5_IRQHandler', 'TIM1_BRK_TIM15_IRQHandler',
  'TIM1_UP_TIM16_IRQHandler', 'TIM1_TRG_COM_TIM17_IRQHandler', 'TIM1_CC_IRQHandler',
  'TIM2_IRQHandler', 'TIM3_IRQHandler', 'TIM4_IRQHandler', 'I2C1_EV_IRQHandler',
  'I2C1_ER_IRQHandler', 'I2C2_EV_IRQHandler', 'I2C2_ER_IRQHandler', 'SPI1_IRQHandler',
  'SPI2_IRQHandler', 'USART1_IRQHandler', 'USART2_IRQHandler', 'USART3_IRQHandler',
  'EXTI15_10_IRQHandler', 'RTC_Alarm_IRQHandler', 'DFSDM1_FLT3_IRQHandler',
  'TIM8_BRK_IRQHandler', 'TIM8_UP_IRQHandler', 'TIM8_TRG_COM_IRQHandler', 'TIM8_CC_IRQHandler',
  'ADC3_IRQHandler', 'FMC_IRQHandler', 'SDMMC1_IRQHandler', 'TIM5_IRQHandler', 'SPI3_IRQHandler',
  'UART4_IRQHandler', 'UART5_IRQHandler', 'TIM6_DAC_IRQHandler', 'TIM7_IRQHandler',
  'DMA2_Channel1_IRQHandler', 'DMA2_Channel2_IRQHandler', 'DMA2_Channel3_IRQHandler',
  'DMA2_Channel4_IRQHandler', 'DMA2_Channel5_IRQHandler', 'DFSDM1_FLT0_IRQHandler',
  'DFSDM1_FLT1_IRQHandler', 'DFSDM1_FLT2_IRQHandler', 'COMP_IRQHandler', 'LPTIM1_IRQHandler',
  'LPTIM2_IRQHandler', 'OTG_FS_IRQHandler', 'DMA2_Channel6_IRQHandler', 'DMA2_Channel7_IRQHandler',
  'LPUART1_IRQHandler', 'QUADSPI_IRQHandler', 'I2C3_EV_IRQHandler', 'I2C3_ER_IRQHandler',
  'SAI1_IRQHandler', 'SAI2_IRQHandler', 'SWPMI1_IRQHandler', 'TSC_IRQHandler', 'LCD_IRQHandler',
  '0', 'RNG_IRQHandler', 'FPU_IRQHandler', 'CRS_IRQHandler', 'I2C4_EV_IRQHandler', 'I2C4_ER_IRQHandler',
  'DCMI_IRQHandler', 'CAN2_TX_IRQHandler', 'CAN2_RX0_IRQHandler', 'CAN2_RX1_IRQHandler',
  'CAN2_SCE_IRQHandler', 'DMA2D_IRQHandler'
];

export const stm32l4ShortInterruptHandlers = [
  ...stm32l4InterruptHandlers.slice(0, stm32l4InterruptHandlers.indexOf('CRS_IRQHandler'))
];

interface Stm32F1ProfileOptions {
  define?: string;
  ramLength?: number;
  gnuStartupFileName?: string;
  interruptHandlers?: string[];
}

interface Stm32F4ProfileOptions {
  ramLength?: number;
  gnuStartupFileName?: string;
  interruptHandlers?: string[];
  additionalMemory?: DeviceProfile['additionalMemory'];
}

interface Stm32L4ProfileOptions {
  define?: string;
  flashLength?: number;
  ramLength?: number;
  additionalMemory?: DeviceProfile['additionalMemory'];
  gnuStartupFileName?: string;
  interruptHandlers?: string[];
}

export function createStm32F1Profile(
  part: string,
  flashLength: number,
  linkerFileName: string,
  options: Stm32F1ProfileOptions = {}
): DeviceProfile {
  return {
    part,
    vendor: 'STM',
    series: 'F1x',
    family: 'STM32F1xx',
    core: 'cortex-m3',
    architecture: 'arm',
    toolchainPrefix: 'arm-none-eabi',
    defines: [options.define ?? 'STM32F103xB'],
    compilerFlags: ['-mcpu=cortex-m3', '-mthumb'],
    flash: { origin: 0x08000000, length: flashLength },
    ram: { origin: 0x20000000, length: options.ramLength ?? 20 * 1024 },
    linkerFileName,
    gnuStartupFileName: options.gnuStartupFileName ?? 'startup_stm32f103xb.S',
    toolchainFileName: 'stm32f1-toolchain.cmake',
    interruptHandlers: [...(options.interruptHandlers ?? stm32f1InterruptHandlers)],
    debugTarget: 'stm32f1x'
  };
}

export function createStm32F4Profile(
  part: string,
  flashLength: number,
  linkerFileName: string,
  define: string,
  options: Stm32F4ProfileOptions = {}
): DeviceProfile {
  return {
    part,
    vendor: 'STM',
    series: 'F4x',
    family: 'STM32F4xx',
    core: 'cortex-m4',
    architecture: 'arm',
    toolchainPrefix: 'arm-none-eabi',
    defines: [define],
    compilerFlags: ['-mcpu=cortex-m4', '-mthumb', '-mfpu=fpv4-sp-d16', '-mfloat-abi=hard'],
    flash: { origin: 0x08000000, length: flashLength },
    ram: { origin: 0x20000000, length: options.ramLength ?? 128 * 1024 },
    additionalMemory: options.additionalMemory ?? [
      { name: 'CCMRAM', attributes: 'rw', origin: 0x10000000, length: 64 * 1024 }
    ],
    linkerFileName,
    gnuStartupFileName: options.gnuStartupFileName ?? 'startup_stm32f407xx.S',
    toolchainFileName: 'stm32f4-toolchain.cmake',
    interruptHandlers: [...(options.interruptHandlers ?? stm32f4InterruptHandlers)],
    debugTarget: 'stm32f4x'
  };
}

export function createStm32L4Profile(
  part: string,
  linkerFileName: string,
  options: Stm32L4ProfileOptions = {}
): DeviceProfile {
  return {
    part,
    vendor: 'STM',
    series: 'L4x',
    family: 'STM32L4xx',
    core: 'cortex-m4',
    architecture: 'arm',
    toolchainPrefix: 'arm-none-eabi',
    defines: [options.define ?? 'STM32L496xx'],
    compilerFlags: ['-mcpu=cortex-m4', '-mthumb', '-mfpu=fpv4-sp-d16', '-mfloat-abi=hard'],
    flash: { origin: 0x08000000, length: options.flashLength ?? 512 * 1024 },
    ram: { origin: 0x20000000, length: options.ramLength ?? 256 * 1024 },
    additionalMemory: options.additionalMemory ?? [
      { name: 'RAM2', attributes: 'rw', origin: 0x10000000, length: 64 * 1024 }
    ],
    linkerFileName,
    gnuStartupFileName: options.gnuStartupFileName ?? 'startup_stm32l496xx.S',
    toolchainFileName: 'stm32l4-toolchain.cmake',
    interruptHandlers: [...(options.interruptHandlers ?? stm32l4InterruptHandlers)],
    debugTarget: 'stm32l4x'
  };
}
