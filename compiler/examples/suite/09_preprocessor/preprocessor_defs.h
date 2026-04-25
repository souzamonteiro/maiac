#ifndef SUITE_PREPROCESSOR_DEFS_H
#define SUITE_PREPROCESSOR_DEFS_H

#define PP_BASE 40
#define PP_OFFSET 2
#define PP_SUM (PP_BASE + PP_OFFSET)
#define PP_ADD(a, b) ((a) + (b))
#define PP_MUL(a, b) ((a) * (b))

#ifdef PP_BASE
#define PP_IFDEF_VALUE 7
#else
#define PP_IFDEF_VALUE -7
#endif

#ifndef PP_NOT_DEFINED
#define PP_IFNDEF_VALUE 11
#else
#define PP_IFNDEF_VALUE -11
#endif

#endif