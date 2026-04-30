#include <stdio.h>
#include <string.h>
#include <ctype.h>

int length(char txt[]) {
    int n;

    n = 0;
    while (txt[n]) {
        n++;
    }

    return n;
}

void to_uppercase(char *source, char *dest) {
    char *p;
    char *q;

    p = source;
    q = dest;

    while (*p) {
        *q = (char)toupper((unsigned char)*p);
        p++;
        q++;
    }

    *q = '\0';
}

int main(void) {
    char name[20];
    char name_upper[20];
    char *p;
    int i;

    printf("Enter your name: ");
    scanf("%19s", name);

    printf("Hello %s!\n", name);

    printf(">>");
    for (i = 0; i < 20; i++) {
        printf("%c", name[i]);
    }
    printf("<<\n");

    printf(">>");
    i = 0;
    while (name[i] != '\0') {
        printf("%c", name[i]);
        i++;
    }
    printf("<<\n");

    printf(">>");
    i = 0;
    while (name[i]) {
        printf("%c", name[i]);
        i++;
    }
    printf("<<\n");

    printf("Your name has %d characters.\n", length(name));
    printf("Your name has %lu characters.\n", (unsigned long)strlen(name));

    p = name;
    printf(">>");
    while (*p) {
        printf("%c", *p);
        p++;
    }
    printf("<<\n");

    to_uppercase(name, name_upper);

    printf("Your name in uppercase is %s.\n", name_upper);

    return 0;
}
