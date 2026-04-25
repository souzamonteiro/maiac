/* 02_control_flow - Branches, loops, switch, break, continue, goto. */
#include <stdio.h>

int main(void) {
    int x;
    int i;
    int j;
    int sum;
    int w;
    int d;
    int mode;
    int cases;
    int br;
    int cont;
    int nested;
    int jumped;

    x = 10;
    if (x > 5) printf("PASS if_true\n");
    else printf("FAIL if_true\n");

    if (x < 5) printf("FAIL if_false\n");
    else printf("PASS if_false\n");

    if (x < 5) printf("FAIL else_if\n");
    else if (x == 10) printf("PASS else_if\n");

    sum = 0;
    for (i = 1; i <= 5; ++i) sum += i;
    if (sum == 15) printf("PASS for_sum\n");

    w = 0;
    i = 0;
    while (w < 4) {
        w++;
        i++;
    }
    if (i == 4) printf("PASS while_count\n");

    d = 0;
    i = 0;
    do {
        d++;
        i++;
    } while (d < 3);
    if (i == 3) printf("PASS do_while_count\n");

    mode = 2;
    switch (mode) {
        case 1:
            printf("FAIL switch\n");
            break;
        case 2:
            printf("PASS switch\n");
            break;
        default:
            printf("FAIL switch\n");
            break;
    }

    cases = 0;
    switch (2) {
        case 1:
            cases++;
        case 2:
            cases++;
        case 3:
            cases++;
    }
    if (cases == 2) printf("PASS switch_fallthrough\n");

    br = 0;
    for (i = 0; i < 10; ++i) {
        if (i == 5) break;
        br++;
    }
    if (br == 5) printf("PASS break\n");

    cont = 0;
    for (i = 0; i < 5; ++i) {
        if (i == 2) continue;
        cont++;
    }
    if (cont == 4) printf("PASS continue\n");

    nested = 0;
    for (i = 0; i < 3; ++i) {
        for (j = 0; j < 4; ++j) {
            if (j == 2) break;
            nested++;
        }
    }
    if (nested == 6) printf("PASS nested_break\n");

    jumped = 0;
    goto set_jump;
    jumped = -1;
set_jump:
    jumped = 1;
    if (jumped == 1) printf("PASS goto\n");

    printf("ALL PASS\n");
    return 0;
}