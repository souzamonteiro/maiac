/* 08_strings - strlen, strcmp, strcpy, strcat, strstr. */
#include <stdio.h>
#include <string.h>

int strlen_simple(const char *s) {
    int count;
    count = 0;
    while (s[count] != '\0') {
        count++;
    }
    return count;
}

int char_count(const char *s, char c) {
    int count;
    count = 0;
    while (*s) {
        if (*s == c) count++;
        s++;
    }
    return count;
}

int main(void) {
    const char *items[3];
    char joined[64];
    int total;

    items[0] = "first";
    items[1] = "second";
    items[2] = "third";

    if (strlen("") == 0) printf("PASS strlen_empty\n");
    if (strcmp("abc", "abc") == 0) printf("PASS strcmp_eq\n");

    strcpy(joined, "foo");
    strcat(joined, "bar");
    if (strcmp(joined, "foobar") == 0) printf("PASS strcat\n");

    total = strlen_simple(items[0]) + strlen_simple(items[1]) + strlen_simple(items[2]);
    if (total == 16) printf("PASS strlen_simple_total\n");

    if (char_count("mississippi", 's') == 4) printf("PASS char_count\n");

    printf("ALL PASS\n");
    return 0;
}