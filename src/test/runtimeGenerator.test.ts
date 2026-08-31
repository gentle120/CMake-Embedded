import assert from 'node:assert/strict';
import test from 'node:test';
import { generateSyscalls, generateSysmem, runtimeSourceNames } from '../generator/runtimeGenerator';

test('places runtime sources in the system directory', () => {
  assert.deepEqual(runtimeSourceNames, ['system/syscalls.c', 'system/sysmem.c']);
});

test('generates newlib syscall implementations for bare-metal firmware', () => {
  const syscalls = generateSyscalls();

  assert.match(syscalls, /_close\(int file\)/);
  assert.match(syscalls, /_fstat\(int file, struct stat \*st\)/);
  assert.match(syscalls, /_isatty\(int file\)/);
  assert.match(syscalls, /_lseek\(int file, int ptr, int dir\)/);
  assert.match(syscalls, /_read\(int file, char \*ptr, int len\)/);
  assert.match(syscalls, /_write\(int file, char \*ptr, int len\)/);
  assert.match(syscalls, /__attribute__\(\(weak\)\)/);
});

test('generates a heap implementation compatible with the linker symbols', () => {
  const sysmem = generateSysmem();

  assert.match(sysmem, /void \*_sbrk\(ptrdiff_t incr\)/);
  assert.match(sysmem, /_end/);
  assert.match(sysmem, /_estack/);
  assert.match(sysmem, /_Min_Stack_Size/);
});
