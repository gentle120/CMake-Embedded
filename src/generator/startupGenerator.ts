import type { DeviceProfile } from '../devices/deviceProfiles';

const interruptHandlers = [
  'WWDGT_IRQHandler',
  'LVD_IRQHandler',
  'TAMPER_IRQHandler',
  'RTC_IRQHandler',
  'FMC_IRQHandler',
  'RCU_IRQHandler',
  'EXTI0_IRQHandler',
  'EXTI1_IRQHandler',
  'EXTI2_IRQHandler',
  'EXTI3_IRQHandler',
  'EXTI4_IRQHandler',
  'DMA0_Channel0_IRQHandler',
  'DMA0_Channel1_IRQHandler',
  'DMA0_Channel2_IRQHandler',
  'DMA0_Channel3_IRQHandler',
  'DMA0_Channel4_IRQHandler',
  'DMA0_Channel5_IRQHandler',
  'DMA0_Channel6_IRQHandler',
  'ADC0_1_IRQHandler',
  'USBD_HP_CAN0_TX_IRQHandler',
  'USBD_LP_CAN0_RX0_IRQHandler',
  'CAN0_RX1_IRQHandler',
  'CAN0_EWMC_IRQHandler',
  'EXTI5_9_IRQHandler',
  'TIMER0_BRK_IRQHandler',
  'TIMER0_UP_IRQHandler',
  'TIMER0_TRG_CMT_IRQHandler',
  'TIMER0_Channel_IRQHandler',
  'TIMER1_IRQHandler',
  'TIMER2_IRQHandler',
  'TIMER3_IRQHandler',
  'I2C0_EV_IRQHandler',
  'I2C0_ER_IRQHandler',
  'I2C1_EV_IRQHandler',
  'I2C1_ER_IRQHandler',
  'SPI0_IRQHandler',
  'SPI1_IRQHandler',
  'USART0_IRQHandler',
  'USART1_IRQHandler',
  'USART2_IRQHandler',
  'EXTI10_15_IRQHandler',
  'RTC_Alarm_IRQHandler',
  'USBD_WKUP_IRQHandler',
  'EXMC_IRQHandler'
];

const coreHandlers = [
  'NMI_Handler',
  'HardFault_Handler',
  'MemManage_Handler',
  'BusFault_Handler',
  'UsageFault_Handler',
  'SVC_Handler',
  'DebugMon_Handler',
  'PendSV_Handler',
  'SysTick_Handler'
];

export function generateGnuStartup(profile: DeviceProfile): string {
  const vectors = [
    '_estack',
    'Reset_Handler',
    ...coreHandlers.slice(0, 1),
    ...coreHandlers.slice(1, 5),
    '0',
    '0',
    '0',
    '0',
    ...coreHandlers.slice(5, 7),
    '0',
    ...coreHandlers.slice(7),
    ...interruptHandlers
  ];
  const vectorLines = vectors.map((handler) => `  .word ${handler}`).join('\n');
  const aliases = [...coreHandlers, ...interruptHandlers]
    .map((handler) => `.weak ${handler}\n.thumb_set ${handler}, Default_Handler`)
    .join('\n');

  return `/* GNU startup generated for ${profile.part}. */
.syntax unified
.cpu ${profile.core}
.thumb

.section .isr_vector,"a",%progbits
.align 2
.global __Vectors
.type __Vectors, %object
__Vectors:
${vectorLines}
.size __Vectors, . - __Vectors

.section .text.Reset_Handler,"ax",%progbits
.thumb_func
.global Reset_Handler
.type Reset_Handler, %function
Reset_Handler:
  ldr sp, =_estack
  bl SystemInit

  ldr r0, =_sidata
  ldr r1, =_sdata
  ldr r2, =_edata
  cmp r1, r2
  bcs 2f
1:
  ldr r3, [r0], #4
  str r3, [r1], #4
  cmp r1, r2
  bcc 1b
2:
  ldr r1, =_sbss
  ldr r2, =_ebss
  movs r3, #0
  cmp r1, r2
  bcs 4f
3:
  str r3, [r1], #4
  adds r1, r1, #4
  cmp r1, r2
  bcc 3b
4:
  bl __libc_init_array
  bl main
5:
  b 5b
.size Reset_Handler, . - Reset_Handler

.section .text.Default_Handler,"ax",%progbits
.thumb_func
.global Default_Handler
.type Default_Handler, %function
Default_Handler:
  b .
.size Default_Handler, . - Default_Handler

${aliases}

.end
`;
}
