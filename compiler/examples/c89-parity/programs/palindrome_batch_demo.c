#include <stdio.h>
#include <string.h>

int is_palindrome(const char *s) {
    int left = 0;
    int right = (int)strlen(s) - 1;

    while (left < right) {
        if (s[left] != s[right]) return 0;
        ++left;
        --right;
    }

    return 1;
}

int main(void) {
    const char *words[5];
    int i;

    words[0] = "level";
    words[1] = "robot";
    words[2] = "radar";
    words[3] = "maiac";
    words[4] = "civic";

    for (i = 0; i < 5; ++i) {
        printf("%s => %s\n", words[i], is_palindrome(words[i]) ? "yes" : "no");
    }

    return 0;
}
