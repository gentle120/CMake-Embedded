import type { DeviceProfile } from '../devices/deviceProfiles';

function kilobytes(bytes: number): string {
  return `${bytes / 1024}K`;
}

function hexadecimal(value: number): string {
  return `0x${value.toString(16).toUpperCase().padStart(8, '0')}`;
}

export function generateLinkerScript(profile: DeviceProfile): string {
  const flashOrigin = hexadecimal(profile.flash.origin);
  const ramOrigin = hexadecimal(profile.ram.origin);
  const flashLength = kilobytes(profile.flash.length);
  const ramLength = kilobytes(profile.ram.length);
  const additionalMemory = (profile.additionalMemory ?? [])
    .map((region) => `  ${region.name} (${region.attributes}) : ORIGIN = ${hexadecimal(region.origin)}, LENGTH = ${kilobytes(region.length)}`)
    .join('\n');
  const memoryLines = [
    `  FLASH (rx)  : ORIGIN = ${flashOrigin}, LENGTH = ${flashLength}`,
    `  RAM (rw)    : ORIGIN = ${ramOrigin}, LENGTH = ${ramLength}`,
    additionalMemory
  ].filter(Boolean).join('\n');

  return `/* Generated for ${profile.part}. Review custom memory reservations before flashing. */
ENTRY(Reset_Handler)

/* Highest address of the stack. */
_estack = ORIGIN(RAM) + LENGTH(RAM);
_Min_Heap_Size = 0x200;
_Min_Stack_Size = 0x400;

MEMORY
{
${memoryLines}
}

SECTIONS
{
  .isr_vector :
  {
    . = ALIGN(4);
    KEEP(*(.isr_vector))
    . = ALIGN(4);
  } >FLASH

  .text :
  {
    . = ALIGN(4);
    *(.text)
    *(.text*)
    *(.glue_7)
    *(.glue_7t)
    *(.eh_frame)

    KEEP(*(.init))
    KEEP(*(.fini))

    . = ALIGN(4);
    _etext = .;
  } >FLASH

  .rodata :
  {
    . = ALIGN(4);
    *(.rodata)
    *(.rodata*)
    . = ALIGN(4);
  } >FLASH

  .ARM.extab (READONLY) :
  {
    . = ALIGN(4);
    *(.ARM.extab* .gnu.linkonce.armextab.*)
    . = ALIGN(4);
  } >FLASH

  .ARM (READONLY) :
  {
    . = ALIGN(4);
    __exidx_start = .;
    *(.ARM.exidx*)
    __exidx_end = .;
    . = ALIGN(4);
  } >FLASH

  .preinit_array (READONLY) :
  {
    . = ALIGN(4);
    PROVIDE_HIDDEN(__preinit_array_start = .);
    KEEP(*(.preinit_array*))
    PROVIDE_HIDDEN(__preinit_array_end = .);
    . = ALIGN(4);
  } >FLASH

  .init_array (READONLY) :
  {
    . = ALIGN(4);
    PROVIDE_HIDDEN(__init_array_start = .);
    KEEP(*(SORT(.init_array.*)))
    KEEP(*(.init_array*))
    PROVIDE_HIDDEN(__init_array_end = .);
    . = ALIGN(4);
  } >FLASH

  .fini_array (READONLY) :
  {
    . = ALIGN(4);
    PROVIDE_HIDDEN(__fini_array_start = .);
    KEEP(*(SORT(.fini_array.*)))
    KEEP(*(.fini_array*))
    PROVIDE_HIDDEN(__fini_array_end = .);
    . = ALIGN(4);
  } >FLASH

  _sidata = LOADADDR(.data);

  .data :
  {
    . = ALIGN(4);
    _sdata = .;
    *(.data)
    *(.data*)
    *(.RamFunc)
    *(.RamFunc*)
    . = ALIGN(4);
    _edata = .;
  } >RAM AT> FLASH

  . = ALIGN(4);
  .bss (NOLOAD) :
  {
    _sbss = .;
    __bss_start__ = _sbss;
    *(.bss)
    *(.bss*)
    *(COMMON)
    . = ALIGN(4);
    _ebss = .;
    __bss_end__ = _ebss;
  } >RAM

  ._user_heap_stack :
  {
    . = ALIGN(8);
    PROVIDE(end = .);
    PROVIDE(_end = .);
    . = . + _Min_Heap_Size;
    . = . + _Min_Stack_Size;
    . = ALIGN(8);
  } >RAM

  /* Fail the link when static data, heap, or stack exceed RAM. */
  ASSERT(_ebss + _Min_Heap_Size + _Min_Stack_Size <= ORIGIN(RAM) + LENGTH(RAM), "RAM overflow")

  .ARM.attributes 0 : { *(.ARM.attributes) }
}
`;
}
