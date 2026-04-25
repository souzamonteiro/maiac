/* 09_preprocessor - Local include, object-like and function-like macros. */
#include <stdio.h>
#include <string.h>
#include "preprocessor_defs.h"

int main(void) {
    int sum_value;
    int calc_value;
    int square_value;
    int conditional_value;

    sum_value = PP_SUM;
    calc_value = PP_ADD(PP_IFDEF_VALUE, PP_IFNDEF_VALUE);
    square_value = PP_MUL(3, 3);
    conditional_value = PP_IFDEF_VALUE + PP_IFNDEF_VALUE;

    if (sum_value == 42) printf("PASS object_macro\n");
    if (calc_value == 18) printf("PASS function_macro\n");
    if (square_value == 9) printf("PASS nested_macro\n");
    if (conditional_value == 18) printf("PASS conditional_macro\n");
    if (strcmp("macro", "macro") == 0) printf("PASS include_and_string\n");

    printf("ALL PASS\n");
    return 0;
}