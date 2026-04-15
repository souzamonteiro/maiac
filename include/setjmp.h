#ifndef _SETJMP_H
#define _SETJMP_H

typedef int jmp_buf[16]; /* implementation-sized */

int setjmp(jmp_buf env);
void longjmp(jmp_buf env, int val);

#endif