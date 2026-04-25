/* 01_operators - Arithmetic, relational, logical, bitwise, compound, ternary. */
#include <stdio.h>

int main(void) {
    int a;
    int b;
    int c;
    double x;
    double y;

    a = 17;
    b = 5;

    if (a + b == 22) printf("PASS add\n");
    if (a - b == 12) printf("PASS sub\n");
    if (a * b == 85) printf("PASS mul\n");
    if (a / b == 3) printf("PASS div\n");
    if (a % b == 2) printf("PASS mod\n");

    if (a == 17) printf("PASS eq\n");
    if (a != b) printf("PASS ne\n");
    if (b < a) printf("PASS lt\n");
    if (a > b) printf("PASS gt\n");
    if (b <= 5) printf("PASS le\n");
    if (a >= 17) printf("PASS ge\n");

    if (a > 0 && b > 0) printf("PASS land\n");
    if (a < 0 || b > 0) printf("PASS lor\n");
    if (!0) printf("PASS lnot\n");

    if ((a & b) == 1) printf("PASS band\n");
    if ((a | b) == 21) printf("PASS bor\n");
    if ((a ^ b) == 20) printf("PASS bxor\n");
    if ((b << 2) == 20) printf("PASS shl\n");
    if ((a >> 1) == 8) printf("PASS shr\n");

    c = 10;
    c += 5;
    if (c == 15) printf("PASS cadd\n");
    c -= 3;
    if (c == 12) printf("PASS csub\n");
    c *= 2;
    if (c == 24) printf("PASS cmul\n");
    c /= 4;
    if (c == 6) printf("PASS cdiv\n");
    c %= 4;
    if (c == 2) printf("PASS cmod\n");

    c = (a > b) ? a : b;
    if (c == 17) printf("PASS ternary\n");

    x = 7.5;
    y = 2.5;
    if (x + y == 10.0) printf("PASS fadd\n");
    if (x - y == 5.0) printf("PASS fsub\n");
    if (x * y == 18.75) printf("PASS fmul\n");
    if (x / y == 3.0) printf("PASS fdiv\n");

    printf("ALL PASS\n");
    return 0;
}