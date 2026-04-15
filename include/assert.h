#ifndef _ASSERT_H
#define _ASSERT_H

#undef assert

#ifdef NDEBUG
#define assert(expression) ((void)0)
#else
void assert(int expression);
#endif

#endif