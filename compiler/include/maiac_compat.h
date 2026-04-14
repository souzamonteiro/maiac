/**
 * maiac_compat.h
 *
 * Portability header for C programs that target both MaiaC/WASM and native
 * compilers (gcc, clang, etc.).
 *
 * Usage:
 *   #include "maiac_compat.h"
 *
 * Under MaiaC (__MAIAC__ is defined):
 *   - printf is a built-in host import – no declaration needed.
 *   - __console__log, __console__error, __Math__sqrt, etc. are declared as
 *     extern host imports (resolved at WASM instantiation time).
 *
 * Under native compilers:
 *   - Standard headers are included.
 *   - __console__log / __console__error / __Math__* are mapped to their
 *     standard-library equivalents via macros so the program compiles without
 *     modification.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * Declaring additional host externs in your own code:
 *
 *   #ifdef __MAIAC__
 *     extern void   __mylib__doSomething(char *msg);
 *     extern double __mylib__compute(double x);
 *   #else
 *     #include "mylib.h"
 *     #define __mylib__doSomething(msg)  mylib_do_something(msg)
 *     #define __mylib__compute(x)        mylib_compute(x)
 *   #endif
 * ─────────────────────────────────────────────────────────────────────────────
 */

#ifndef MAIAC_COMPAT_H
#define MAIAC_COMPAT_H

/* ═══════════════════════════════════════════════════════════════════════════
 * MaiaC / WASM target
 * ═══════════════════════════════════════════════════════════════════════════ */
#ifdef __MAIAC__

/*
 * printf is provided as a built-in host import – no #include required.
 * If you need the prototype for forward-declaration purposes only, you may
 * declare it here, but it is not necessary.
 */

/* console.log / console.error */
extern void __console__log(char *message);
extern void __console__error(char *message);

/* Math object */
extern double __Math__sqrt(double x);
extern double __Math__cbrt(double x);
extern double __Math__abs(double x);
extern double __Math__ceil(double x);
extern double __Math__floor(double x);
extern double __Math__round(double x);
extern double __Math__trunc(double x);
extern double __Math__sin(double x);
extern double __Math__cos(double x);
extern double __Math__tan(double x);
extern double __Math__asin(double x);
extern double __Math__acos(double x);
extern double __Math__atan(double x);
extern double __Math__exp(double x);
extern double __Math__log(double x);
extern double __Math__log2(double x);
extern double __Math__log10(double x);
extern double __Math__pow(double base, double exp);
extern double __Math__min(double a, double b);
extern double __Math__max(double a, double b);
extern double __Math__random(void);

/* alert / prompt (browser) */
extern void __alert(char *message);

/* ═══════════════════════════════════════════════════════════════════════════
 * Native target (gcc, clang, …)
 * ═══════════════════════════════════════════════════════════════════════════ */
#else /* !__MAIAC__ */

#include <stdio.h>
#include <math.h>
#include <stdlib.h>

/* Map __console__log / __console__error to fprintf */
#define __console__log(msg)    fprintf(stdout, "%s\n", (msg))
#define __console__error(msg)  fprintf(stderr, "%s\n", (msg))

/* Map __Math__* to <math.h> functions */
#define __Math__sqrt(x)    sqrt((double)(x))
#define __Math__cbrt(x)    cbrt((double)(x))
#define __Math__abs(x)     fabs((double)(x))
#define __Math__ceil(x)    ceil((double)(x))
#define __Math__floor(x)   floor((double)(x))
#define __Math__round(x)   round((double)(x))
#define __Math__trunc(x)   trunc((double)(x))
#define __Math__sin(x)     sin((double)(x))
#define __Math__cos(x)     cos((double)(x))
#define __Math__tan(x)     tan((double)(x))
#define __Math__asin(x)    asin((double)(x))
#define __Math__acos(x)    acos((double)(x))
#define __Math__atan(x)    atan((double)(x))
#define __Math__exp(x)     exp((double)(x))
#define __Math__log(x)     log((double)(x))
#define __Math__log2(x)    log2((double)(x))
#define __Math__log10(x)   log10((double)(x))
#define __Math__pow(b,e)   pow((double)(b),(double)(e))
#define __Math__min(a,b)   fmin((double)(a),(double)(b))
#define __Math__max(a,b)   fmax((double)(a),(double)(b))
#define __Math__random()   ((double)rand() / (double)RAND_MAX)

/* alert: print to stdout (closest native equivalent) */
#define __alert(msg)       printf("%s\n", (msg))

#endif /* __MAIAC__ */

#endif /* MAIAC_COMPAT_H */
