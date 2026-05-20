/* 11_host_extern - Host import bridge for console and Math. */
extern int __console__log(char *message);
extern double __Math__sqrt(double x);
extern int __Math__floor(double x);

int main(void) {
    double root;

    __console__log("PASS host_console_log");

    root = __Math__sqrt(144.0);
    if (__Math__floor(root) == 12) {
        __console__log("PASS host_math_sqrt");
    }

    __console__log("ALL PASS");
    return 0;
}