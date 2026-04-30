#include <stdio.h>

int main(int argc, char *argv[], char **env) {
    int i;
    char **p;

    for (i = 0; i < argc; i++) {
        printf("argv[%d] = %s\n", i, argv[i]);
    }

    p = env;
    while (*p) {
        printf("%s\n", *p);
        p++;
    }

    return 0;
}
