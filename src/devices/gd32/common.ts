import type { DeviceProfile } from '../deviceProfiles';

export const gd32f1InterruptHandlers = [
  'WWDGT_IRQHandler', 'LVD_IRQHandler', 'TAMPER_IRQHandler', 'RTC_IRQHandler',
  'FMC_IRQHandler', 'RCU_IRQHandler', 'EXTI0_IRQHandler', 'EXTI1_IRQHandler',
  'EXTI2_IRQHandler', 'EXTI3_IRQHandler', 'EXTI4_IRQHandler', 'DMA0_Channel0_IRQHandler',
  'DMA0_Channel1_IRQHandler', 'DMA0_Channel2_IRQHandler', 'DMA0_Channel3_IRQHandler',
  'DMA0_Channel4_IRQHandler', 'DMA0_Channel5_IRQHandler', 'DMA0_Channel6_IRQHandler',
  'ADC0_1_IRQHandler', 'USBD_HP_CAN0_TX_IRQHandler', 'USBD_LP_CAN0_RX0_IRQHandler',
  'CAN0_RX1_IRQHandler', 'CAN0_EWMC_IRQHandler', 'EXTI5_9_IRQHandler',
  'TIMER0_BRK_IRQHandler', 'TIMER0_UP_IRQHandler', 'TIMER0_TRG_CMT_IRQHandler',
  'TIMER0_Channel_IRQHandler', 'TIMER1_IRQHandler', 'TIMER2_IRQHandler', 'TIMER3_IRQHandler',
  'I2C0_EV_IRQHandler', 'I2C0_ER_IRQHandler', 'I2C1_EV_IRQHandler', 'I2C1_ER_IRQHandler',
  'SPI0_IRQHandler', 'SPI1_IRQHandler', 'USART0_IRQHandler', 'USART1_IRQHandler',
  'USART2_IRQHandler', 'EXTI10_15_IRQHandler', 'RTC_Alarm_IRQHandler', 'USBD_WKUP_IRQHandler',
  'EXMC_IRQHandler'
];

export const gd32f1HighDensityInterruptHandlers = [
  'WWDGT_IRQHandler', 'LVD_IRQHandler', 'TAMPER_IRQHandler', 'RTC_IRQHandler',
  'FMC_IRQHandler', 'RCU_IRQHandler', 'EXTI0_IRQHandler', 'EXTI1_IRQHandler',
  'EXTI2_IRQHandler', 'EXTI3_IRQHandler', 'EXTI4_IRQHandler', 'DMA0_Channel0_IRQHandler',
  'DMA0_Channel1_IRQHandler', 'DMA0_Channel2_IRQHandler', 'DMA0_Channel3_IRQHandler',
  'DMA0_Channel4_IRQHandler', 'DMA0_Channel5_IRQHandler', 'DMA0_Channel6_IRQHandler',
  'ADC0_1_IRQHandler', 'USBD_HP_CAN0_TX_IRQHandler', 'USBD_LP_CAN0_RX0_IRQHandler',
  'CAN0_RX1_IRQHandler', 'CAN0_EWMC_IRQHandler', 'EXTI5_9_IRQHandler',
  'TIMER0_BRK_IRQHandler', 'TIMER0_UP_IRQHandler', 'TIMER0_TRG_CMT_IRQHandler',
  'TIMER0_Channel_IRQHandler', 'TIMER1_IRQHandler', 'TIMER2_IRQHandler', 'TIMER3_IRQHandler',
  'I2C0_EV_IRQHandler', 'I2C0_ER_IRQHandler', 'I2C1_EV_IRQHandler', 'I2C1_ER_IRQHandler',
  'SPI0_IRQHandler', 'SPI1_IRQHandler', 'USART0_IRQHandler', 'USART1_IRQHandler',
  'USART2_IRQHandler', 'EXTI10_15_IRQHandler', 'RTC_Alarm_IRQHandler', 'USBD_WKUP_IRQHandler',
  'TIMER7_BRK_IRQHandler', 'TIMER7_UP_IRQHandler', 'TIMER7_TRG_CMT_IRQHandler',
  'TIMER7_Channel_IRQHandler', 'ADC2_IRQHandler', 'EXMC_IRQHandler', 'SDIO_IRQHandler',
  'TIMER4_IRQHandler', 'SPI2_IRQHandler', 'UART3_IRQHandler', 'UART4_IRQHandler',
  'TIMER5_IRQHandler', 'TIMER6_IRQHandler', 'DMA1_Channel0_IRQHandler',
  'DMA1_Channel1_IRQHandler', 'DMA1_Channel2_IRQHandler', 'DMA1_Channel3_4_IRQHandler'
];

interface Gd32F1ProfileOptions {
  define?: string;
  ramLength?: number;
  gnuStartupFileName?: string;
  interruptHandlers?: string[];
}

export const gd32f4InterruptHandlers = [
  'WWDGT_IRQHandler', 'LVD_IRQHandler', 'TAMPER_STAMP_IRQHandler', 'RTC_WKUP_IRQHandler',
  'FMC_IRQHandler', 'RCU_CTC_IRQHandler', 'EXTI0_IRQHandler', 'EXTI1_IRQHandler',
  'EXTI2_IRQHandler', 'EXTI3_IRQHandler', 'EXTI4_IRQHandler', 'DMA0_Channel0_IRQHandler',
  'DMA0_Channel1_IRQHandler', 'DMA0_Channel2_IRQHandler', 'DMA0_Channel3_IRQHandler',
  'DMA0_Channel4_IRQHandler', 'DMA0_Channel5_IRQHandler', 'DMA0_Channel6_IRQHandler',
  'ADC_IRQHandler', 'CAN0_TX_IRQHandler', 'CAN0_RX0_IRQHandler', 'CAN0_RX1_IRQHandler',
  'CAN0_EWMC_IRQHandler', 'EXTI5_9_IRQHandler', 'TIMER0_BRK_TIMER8_IRQHandler',
  'TIMER0_UP_TIMER9_IRQHandler', 'TIMER0_TRG_CMT_TIMER10_IRQHandler', 'TIMER0_Channel_IRQHandler',
  'TIMER1_IRQHandler', 'TIMER2_IRQHandler', 'TIMER3_IRQHandler', 'I2C0_EV_IRQHandler',
  'I2C0_ER_IRQHandler', 'I2C1_EV_IRQHandler', 'I2C1_ER_IRQHandler', 'SPI0_IRQHandler',
  'SPI1_IRQHandler', 'USART0_IRQHandler', 'USART1_IRQHandler', 'USART2_IRQHandler',
  'EXTI10_15_IRQHandler', 'RTC_Alarm_IRQHandler', 'USBFS_WKUP_IRQHandler',
  'TIMER7_BRK_TIMER11_IRQHandler', 'TIMER7_UP_TIMER12_IRQHandler',
  'TIMER7_TRG_CMT_TIMER13_IRQHandler', 'TIMER7_Channel_IRQHandler', 'DMA0_Channel7_IRQHandler',
  'EXMC_IRQHandler', 'SDIO_IRQHandler', 'TIMER4_IRQHandler', 'SPI2_IRQHandler', 'UART3_IRQHandler',
  'UART4_IRQHandler', 'TIMER5_DAC_IRQHandler', 'TIMER6_IRQHandler', 'DMA1_Channel0_IRQHandler',
  'DMA1_Channel1_IRQHandler', 'DMA1_Channel2_IRQHandler', 'DMA1_Channel3_IRQHandler',
  'DMA1_Channel4_IRQHandler', 'ENET_IRQHandler', 'ENET_WKUP_IRQHandler', 'CAN1_TX_IRQHandler',
  'CAN1_RX0_IRQHandler', 'CAN1_RX1_IRQHandler', 'CAN1_EWMC_IRQHandler', 'USBFS_IRQHandler',
  'DMA1_Channel5_IRQHandler', 'DMA1_Channel6_IRQHandler', 'DMA1_Channel7_IRQHandler',
  'USART5_IRQHandler', 'I2C2_EV_IRQHandler', 'I2C2_ER_IRQHandler', 'USBHS_EP1_Out_IRQHandler',
  'USBHS_EP1_In_IRQHandler', 'USBHS_WKUP_IRQHandler', 'USBHS_IRQHandler', 'DCI_IRQHandler',
  'TRNG_IRQHandler', 'FPU_IRQHandler', 'UART6_IRQHandler', 'UART7_IRQHandler', 'SPI3_IRQHandler',
  'SPI4_IRQHandler', 'SPI5_IRQHandler', 'TLI_IRQHandler', 'TLI_ER_IRQHandler', 'IPA_IRQHandler'
];

export function createGd32F1Profile(
  part: string,
  flashLength: number,
  linkerFileName: string,
  options: Gd32F1ProfileOptions = {}
): DeviceProfile {
  return {
    part,
    vendor: 'GD',
    series: 'F1x',
    family: 'GD32F10x',
    core: 'cortex-m3',
    architecture: 'arm',
    toolchainPrefix: 'arm-none-eabi',
    defines: [options.define ?? 'GD32F10X_MD'],
    compilerFlags: ['-mcpu=cortex-m3', '-mthumb'],
    flash: { origin: 0x08000000, length: flashLength },
    ram: { origin: 0x20000000, length: options.ramLength ?? 20 * 1024 },
    linkerFileName,
    gnuStartupFileName: options.gnuStartupFileName ?? 'startup_gd32f10x_md.S',
    toolchainFileName: 'gd32-toolchain.cmake',
    interruptHandlers: [...(options.interruptHandlers ?? gd32f1InterruptHandlers)],
    debugTarget: 'stm32f1x'
  };
}

export function createGd32F4Profile(
  part: string,
  flashLength: number,
  ramLength: number,
  linkerFileName: string,
  define: string,
  startupFileName: string
): DeviceProfile {
  return {
    part,
    vendor: 'GD',
    series: 'F4x',
    family: 'GD32F4xx',
    core: 'cortex-m4',
    architecture: 'arm',
    toolchainPrefix: 'arm-none-eabi',
    defines: [define],
    compilerFlags: ['-mcpu=cortex-m4', '-mthumb', '-mfpu=fpv4-sp-d16', '-mfloat-abi=hard'],
    flash: { origin: 0x08000000, length: flashLength },
    ram: { origin: 0x20000000, length: ramLength },
    additionalMemory: [{ name: 'TCMSRAM', attributes: 'rwx', origin: 0x10000000, length: 64 * 1024 }],
    linkerFileName,
    gnuStartupFileName: startupFileName,
    toolchainFileName: 'gd32f4-toolchain.cmake',
    interruptHandlers: [...gd32f4InterruptHandlers],
    debugTarget: 'stm32f4x'
  };
}
