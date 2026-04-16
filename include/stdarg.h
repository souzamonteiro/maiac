#ifndef _STDARG_H
#define _STDARG_H

typedef char *va_list;

#define va_start(ap, parmN) ((void)(parmN), (ap = (va_list)__maiac_va_base))
#define va_arg(ap, type)    (*(type *)((ap += sizeof(type)) - sizeof(type)))
#define va_end(ap)          (ap = (va_list)0)

#endif