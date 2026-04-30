#include <stdio.h>
#include <string.h>
#include <ctype.h>

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
    char text[255];
    char upper_case[255];
    char *p;
    int i;

    printf("Write a word: ");
    scanf("%254s", text);

    text[0] = '@';
    for (i = 0; i < (int)strlen(text); i++) {
        printf("%c\n", text[i]);
    }

    p = text;
    printf("Address pointed to by p: %p\n", (void *)p);
    while (*p) {
        printf("%c", *p);
        p++;
    }

    printf("\n");

    to_uppercase(text, upper_case);

    printf("Text in uppercase: %s\n", upper_case);

    return 0;
}
