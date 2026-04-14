/*
 * test-extern.c – Demonstrates the __object__method extern convention.
 *
 * Naming convention recap
 * -----------------------
 * Any function whose name starts with __ is treated as a host-provided import.
 * The segments separated by __ encode the JavaScript call path:
 *
 *   extern void __console__log(char *msg);   → console.log(msg)
 *   extern void __console__error(char *msg); → console.error(msg)
 *   extern double __Math__sqrt(double x);    → Math.sqrt(x)
 *   extern void __alert(char *msg);          → alert(msg)  (global)
 *
 * The compiler:
 *   1. Emits a WAT import using "env" as the module and the full C name as
 *      the field:   (import "env" "__console__log" (func $imp___console__log ...))
 *   2. Exposes per-import metadata in result.hostImports so the JS runner can
 *      automatically build the correct env wrappers (string dereferencing,
 *      method binding).
 *
 * Run with:
 *   node tools/run-test-node.js compiler/examples/test-extern.c
 */

/* Host extern declarations */
extern void __console__log(char *message);
extern void __console__error(char *message);
extern double __Math__sqrt(double x);
extern int __Math__floor(double x);

int main() {
    double value;
    double root;
    int floored;

    __console__log("=== test-extern.c ===");

    __console__log("Testing __console__log: hello from C!");
    __console__error("Testing __console__error: this is an error message");

    value = 144.0;
    root = __Math__sqrt(value);
    /* root should be 12 */
    if (__Math__floor(root) == 12) {
        __console__log("Math.sqrt(144) == 12  [PASS]");
    } else {
        __console__error("Math.sqrt(144) != 12  [FAIL]");
    }

    value = 2.0;
    root = __Math__sqrt(value);
    /* floor(sqrt(2)) should be 1 */
    if (__Math__floor(root) == 1) {
        __console__log("floor(Math.sqrt(2)) == 1  [PASS]");
    } else {
        __console__error("floor(Math.sqrt(2)) != 1  [FAIL]");
    }

    __console__log("=== done ===");
    return 0;
}
