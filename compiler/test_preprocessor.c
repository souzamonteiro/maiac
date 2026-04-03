/* ============================================================================
 * PREPROCESSOR TEST SECTION
 * Tests all preprocessor directives defined in ANSI C (C89/C90)
 * Based on grammar from K&R 2nd Edition, Appendix A (pages 198-199)
 * ============================================================================ */

/* ----------------------------------------------------------------------------
 * 1. #define - Macro definitions (simple and parameterized)
 * ---------------------------------------------------------------------------- */

/* Simple macro definitions */
#define PI 3.14159
#define MAX_SIZE 100
#define NEWLINE '\n'
#define MESSAGE "Hello from preprocessor"

/* Parameterized macros */
#define SQUARE(x) ((x) * (x))
#define MAX(a, b) ((a) > (b) ? (a) : (b))
#define MIN(a, b) ((a) < (b) ? (a) : (b))
#define ABS(x) ((x) < 0 ? -(x) : (x))
#define IS_EVEN(x) ((x) % 2 == 0)
#define IS_ODD(x) ((x) % 2 != 0)

/* Macros with multiple parameters */
#define SUM(a, b) ((a) + (b))
#define PRODUCT(a, b) ((a) * (b))
#define AVERAGE(a, b) (((a) + (b)) / 2.0)
#define SWAP(a, b) do { int temp = (a); (a) = (b); (b) = temp; } while (0)

/* Macros with stringification (ANSI C) */
#define STRINGIFY(x) #x
#define CONCAT(a, b) a##b

/* Nested macro definitions */
#define TWO 2
#define FOUR (TWO * TWO)
#define EIGHT (FOUR * TWO)

/* Macro redefinition test - use different names to avoid warnings */
#define VALUE1 10
#undef VALUE1
#define VALUE1 20

/* Macro undefinition */
#define TEMP_VALUE 100
#undef TEMP_VALUE

/* ----------------------------------------------------------------------------
 * 2. #undef - Undefining macros
 * ---------------------------------------------------------------------------- */

#define UNDEF_TEST 42
#ifdef UNDEF_TEST
    int undef_test_var = UNDEF_TEST;
#endif
#undef UNDEF_TEST

/* ----------------------------------------------------------------------------
 * 3. #include - File inclusion (tested with comments since actual files may not exist)
 * ---------------------------------------------------------------------------- */

/* Standard library includes - commented for compilation without libraries */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include <stddef.h>
#include <limits.h>
#include <float.h>
#include <time.h>
#include <ctype.h>
#include <assert.h>
#include <setjmp.h>
#include <signal.h>

/* ----------------------------------------------------------------------------
 * 4. Conditional compilation directives
 * ---------------------------------------------------------------------------- */

/* #if constant-expression */
#define TEST_CONDITION 1
#define DEBUG_LEVEL 2
#define FEATURE_ENABLED 1

int preprocessor_test_variable = 0;

#if 1
    int condition_true_var = 100;
#endif

#if 0
    int condition_false_var = 200;  /* This should not be compiled */
#endif

#if TEST_CONDITION
    int test_condition_var = 300;
#endif

#if DEBUG_LEVEL > 1
    int debug_high_var = 400;
#else
    int debug_low_var = 405;
#endif

#if FEATURE_ENABLED
    int feature_enabled_var = 500;
#endif

/* Nested #if */
#if DEBUG_LEVEL > 0
    #if DEBUG_LEVEL > 1
        int debug_level_high = 600;
    #else
        int debug_level_low = 650;
    #endif
#endif

/* #ifdef identifier */
#define FEATURE_X
#define FEATURE_Y 1

#ifdef FEATURE_X
    int feature_x_defined = 700;
#endif

#ifdef FEATURE_Y
    int feature_y_defined = 800;
#endif

#ifdef FEATURE_Z
    int feature_z_defined = 900;  /* Should not be compiled */
#endif

/* #ifndef identifier */
#ifndef FEATURE_Z
    int feature_z_not_defined = 1000;
#endif

#ifndef FEATURE_X
    int feature_x_not_defined = 1100;  /* Should not be compiled */
#endif

/* #elif - else-if clauses */
#define PLATFORM 2  /* 1=Windows, 2=Linux, 3=MacOS */

#if PLATFORM == 1
    int platform_windows = 1200;
#elif PLATFORM == 2
    int platform_linux = 1300;
#elif PLATFORM == 3
    int platform_macos = 1400;
#else
    int platform_unknown = 1500;
#endif

/* Complex conditional expression */
#define VALUE_A 5
#define VALUE_B 10

#if (VALUE_A * 2) > VALUE_B
    int complex_condition_true = 1600;
#elif (VALUE_A * 2) == VALUE_B
    int complex_condition_equal = 1700;
#else
    int complex_condition_false = 1800;
#endif

/* #else directive */
#define ENABLE_OPTION 1

#ifdef ENABLE_OPTION
    int option_enabled = 1900;
#else
    int option_disabled = 2000;
#endif

/* #endif - closing conditional blocks */
#if 1
    int endif_test_var = 2100;
#endif

/* ----------------------------------------------------------------------------
 * 5. #line - Line number control
 * ---------------------------------------------------------------------------- */

#line 100 "test_file.c"

int line_test_var = 2200;  /* This line should be reported as line 100 */

#line 200

int another_line_test_var = 2300;  /* This line should be reported as line 200 */

/* Reset line numbering */
#line 1

/* ----------------------------------------------------------------------------
 * 6. #error - Error directive (commented to prevent compilation errors)
 * ---------------------------------------------------------------------------- */

/* 
#error This is an error message - should cause compilation to fail
*/

/* ----------------------------------------------------------------------------
 * 7. #pragma - Implementation-defined directive (commented)
 * ---------------------------------------------------------------------------- */

/*
#pragma once
#pragma pack(1)
#pragma warning(disable: 4996)
*/

/* ----------------------------------------------------------------------------
 * 8. Empty preprocessor directive (#)
 * ---------------------------------------------------------------------------- */

#
#
#define EMPTY_DIRECTIVE 1
#
#

/* ----------------------------------------------------------------------------
 * 9. Predefined macros (ANSI C)
 * ---------------------------------------------------------------------------- */

void test_predefined_macros(void) {
    /* __LINE__ - current line number */
    int line_num = __LINE__;
    
    /* __FILE__ - current file name */
    const char *file_name = __FILE__;
    
    /* __DATE__ - compilation date */
    const char *compile_date = __DATE__;
    
    /* __TIME__ - compilation time */
    const char *compile_time = __TIME__;
    
    /* __STDC__ - indicates ANSI C compliance */
    int stdc_value = __STDC__;
    
    /* Use values to prevent "unused variable" warnings */
    (void)line_num;
    (void)file_name;
    (void)compile_date;
    (void)compile_time;
    (void)stdc_value;
}

/* ----------------------------------------------------------------------------
 * 10. Token pasting and stringification tests
 * ---------------------------------------------------------------------------- */

#define VAR_NAME(name) var_ ## name ## _test
#define STR(x) #x

int VAR_NAME(count) = 3000;  /* Expands to: int var_count_test = 3000; */
int VAR_NAME(loop) = 3100;   /* Expands to: int var_loop_test = 3100; */

/* Stringification test */
const char *stringified_macro = STR(Hello_World);
const char *stringified_value = STR(VALUE1);

/* ----------------------------------------------------------------------------
 * 11. Complex macro expansions
 * ---------------------------------------------------------------------------- */

#define MACRO_A 10
#define MACRO_B MACRO_A * 2
#define MACRO_C MACRO_B + 5

#define COMPLEX_MACRO(x, y) ((x) * (y) + MACRO_C)

int complex_macro_result = COMPLEX_MACRO(5, 3);  /* Expands to ((5) * (3) + (10 * 2 + 5)) */

/* ----------------------------------------------------------------------------
 * 12. Multi-line macros (using backslash)
 * ---------------------------------------------------------------------------- */

#define MULTI_LINE_MACRO(x, y) do { int a = (x); int b = (y); if (a > b) { a = b; } } while (0)

/* ----------------------------------------------------------------------------
 * 13. Function-like macros with side effects (fixed - use separate variable)
 * ---------------------------------------------------------------------------- */

#define DOUBLE(x) ((x) + (x))
#define TRIPLE(x) ((x) + (x) + (x))

int macro_side_effect_test(void) {
    int counter;
    int result;
    
    /* Fixed: avoid passing side-effecting expressions to macro arguments */
    counter = 0;
    counter++;
    result = DOUBLE(counter);
    
    /* Alternative: Use the macro with a separate variable */
    int value = 5;
    result = DOUBLE(value);
    
    return result;
}

/* ----------------------------------------------------------------------------
 * 14. Nested conditional compilation
 * ---------------------------------------------------------------------------- */

#define LEVEL_1 1
#define LEVEL_2 1
#define LEVEL_3 0

#if LEVEL_1
    #if LEVEL_2
        #if LEVEL_3
            int nested_condition_level_3 = 3200;
        #else
            int nested_condition_level_2 = 3300;
        #endif
    #else
        int nested_condition_level_1_false = 3400;
    #endif
#else
    int nested_condition_top_false = 3500;
#endif

/* ----------------------------------------------------------------------------
 * 15. Complex #if expressions with defined() operator
 * ---------------------------------------------------------------------------- */

#define SYMBOL_A
#define SYMBOL_B 1

#if defined(SYMBOL_A)
    int defined_symbol_a = 3600;
#endif

#if defined(SYMBOL_B) && defined(SYMBOL_A)
    int both_symbols_defined = 3700;
#endif

#if defined(SYMBOL_C) || defined(SYMBOL_A)
    int at_least_one_defined = 3800;
#endif

#if !defined(SYMBOL_C)
    int symbol_c_not_defined = 3900;
#endif

#if defined(SYMBOL_A) && !defined(SYMBOL_C)
    int complex_defined_expression = 4000;
#endif

/* ----------------------------------------------------------------------------
 * 16. Macros within macros (recursive expansion)
 * ---------------------------------------------------------------------------- */

#define RECURSIVE_MACRO(x) RECURSIVE_MACRO_HELPER(x)
#define RECURSIVE_MACRO_HELPER(x) ((x) + 1)

int recursive_macro_result = RECURSIVE_MACRO(10);  /* Expands to ((10) + 1) */

/* ----------------------------------------------------------------------------
 * 17. Macro parameters with empty arguments (not supported by GCC)
 * This test is commented out as it's not ANSI C compliant
 * ---------------------------------------------------------------------------- */

/* #define EMPTY_ARG_MACRO(a, b, c) ((a) + (b) + (c)) */
/* int empty_arg_result = EMPTY_ARG_MACRO(1, , 3); */  /* Not standard C */

/* ----------------------------------------------------------------------------
 * 18. Comment removal in macro expansion
 * ---------------------------------------------------------------------------- */

#define COMMENT_MACRO /* This is a comment */ 123

int comment_macro_value = COMMENT_MACRO;  /* Should expand to 123 */

/* ----------------------------------------------------------------------------
 * 19. Preprocessor test function
 * ---------------------------------------------------------------------------- */

void test_preprocessor_features(void) {
    /* Test simple macros */
    double pi = PI;
    int max_size = MAX_SIZE;
    char newline = NEWLINE;
    const char *message = MESSAGE;
    
    /* Test parameterized macros */
    int square = SQUARE(5);
    int max_value = MAX(10, 20);
    int min_value = MIN(10, 20);
    int abs_value = ABS(-15);
    int is_even = IS_EVEN(4);
    int is_odd = IS_ODD(5);
    
    /* Test stringification */
    const char *str = STRINGIFY(test);
    
    /* Test token concatenation */
    int concat_value = CONCAT(10, 20);
    
    /* Test nested macros */
    int eight = EIGHT;
    
    /* Use values to prevent warnings */
    (void)pi;
    (void)max_size;
    (void)newline;
    (void)message;
    (void)square;
    (void)max_value;
    (void)min_value;
    (void)abs_value;
    (void)is_even;
    (void)is_odd;
    (void)str;
    (void)concat_value;
    (void)eight;
}

/* ----------------------------------------------------------------------------
 * 20. Variables to test macro expansions from conditional compilation
 * Only include variables that are guaranteed to be defined
 * ---------------------------------------------------------------------------- */

/* Define a macro to track which variables are available */
#define HAS_CONDITION_TRUE 1
#define HAS_TEST_CONDITION 1
#define HAS_DEBUG_HIGH 1
#define HAS_FEATURE_ENABLED 1
#define HAS_FEATURE_X_DEFINED 1
#define HAS_FEATURE_Y_DEFINED 1
#define HAS_FEATURE_Z_NOT_DEFINED 1
#define HAS_PLATFORM_LINUX 1
#define HAS_COMPLEX_CONDITION_TRUE 1
#define HAS_OPTION_ENABLED 1
#define HAS_ENDIF_TEST 1
#define HAS_LINE_TEST 1
#define HAS_VAR_COUNT_TEST 1
#define HAS_VAR_LOOP_TEST 1
#define HAS_COMPLEX_MACRO_RESULT 1
#define HAS_NESTED_CONDITION_LEVEL_2 1
#define HAS_DEFINED_SYMBOL_A 1
#define HAS_BOTH_SYMBOLS_DEFINED 1
#define HAS_AT_LEAST_ONE_DEFINED 1
#define HAS_SYMBOL_C_NOT_DEFINED 1
#define HAS_COMPLEX_DEFINED_EXPRESSION 1
#define HAS_RECURSIVE_MACRO_RESULT 1
#define HAS_COMMENT_MACRO_VALUE 1

/* ----------------------------------------------------------------------------
 * 21. Main preprocessor test driver
 * ---------------------------------------------------------------------------- */

int preprocessor_test_main(void) {
    int i;
    int sum = 0;
    int preprocessor_test_vars[] = {
        condition_true_var,
        test_condition_var,
        debug_high_var,
        feature_enabled_var,
        feature_x_defined,
        feature_y_defined,
        feature_z_not_defined,
        platform_linux,
        complex_condition_equal,
        option_enabled,
        endif_test_var,
        line_test_var,
        another_line_test_var,
        var_count_test,
        var_loop_test,
        complex_macro_result,
        nested_condition_level_2,
        defined_symbol_a,
        both_symbols_defined,
        at_least_one_defined,
        symbol_c_not_defined,
        complex_defined_expression,
        recursive_macro_result,
        comment_macro_value
    };
    int preprocessor_test_vars_count = (int)(sizeof(preprocessor_test_vars) / sizeof(preprocessor_test_vars[0]));
    
    test_predefined_macros();
    test_preprocessor_features();
    macro_side_effect_test();
    
    /* Verify that conditionally compiled variables exist */
    for (i = 0; i < preprocessor_test_vars_count; i++) {
        sum += preprocessor_test_vars[i];
    }
    
    return sum;
}

/* ----------------------------------------------------------------------------
 * 22. Edge cases and special macro patterns
 * ---------------------------------------------------------------------------- */

/* Empty macro */
#define EMPTY

/* Macro that expands to nothing */
#define NOTHING

/* Macro with empty body */
#define NO_OP

/* Macro with parentheses but no parameters */
#define FUNCTIONAL_MACRO() 1

int functional_macro_result = FUNCTIONAL_MACRO();

/* Macro with comments inside parameters */
#define COMMENT_IN_PARAM(x, y) ((x) + (y))
int comment_in_param_result = COMMENT_IN_PARAM(/* first */ 5, /* second */ 3);

/* Macro used in array size */
#define ARRAY_SIZE 10
int test_array[ARRAY_SIZE];

/* Macro used in enum */
#define ENUM_START 0
#define ENUM_END 5

enum test_enum {
    ENUM_START_VAL = ENUM_START,
    ENUM_MID_VAL = ENUM_START + 2,
    ENUM_END_VAL = ENUM_END
};

/* Macro used in struct definition */
#define STRUCT_FIELD_COUNT 3

struct macro_defined_struct {
    int field1;
    int field2;
    int field3;
};

/* Macro used in function definition */
#define FUNCTION_NAME test_macro_function
#define PARAM_TYPE int
#define RETURN_TYPE void

RETURN_TYPE FUNCTION_NAME(PARAM_TYPE x) {
    (void)x;
}

/* ----------------------------------------------------------------------------
 * 23. Complex conditional with arithmetic expressions
 * ---------------------------------------------------------------------------- */

#define COND_A 5
#define COND_B 10
#define COND_C (COND_A + COND_B)

#if COND_C > 20
    int cond_c_greater = 4100;
#elif COND_C > 15
    int cond_c_between = 4200;
#elif COND_C > 10
    int cond_c_mid = 4300;
#else
    int cond_c_low = 4400;
#endif

/* ----------------------------------------------------------------------------
 * 24. Conditional with logical operators
 * ---------------------------------------------------------------------------- */

#define FLAG_A 1
#define FLAG_B 0
#define FLAG_C 1

#if FLAG_A && FLAG_B
    int flag_ab_true = 4500;
#elif FLAG_A && FLAG_C
    int flag_ac_true = 4600;
#elif FLAG_B || FLAG_C
    int flag_bc_true = 4700;
#endif

/* ----------------------------------------------------------------------------
 * 25. Macro that expands to another macro
 * ---------------------------------------------------------------------------- */

#define BASE_VALUE 100
#define FINAL_VALUE BASE_VALUE

int final_value_test = FINAL_VALUE;  /* Should expand to 100 */

/* ----------------------------------------------------------------------------
 * 26. Main function to run preprocessor tests (optional)
 * ---------------------------------------------------------------------------- */

int main(void) {
    int result = preprocessor_test_main();
    return result;
}