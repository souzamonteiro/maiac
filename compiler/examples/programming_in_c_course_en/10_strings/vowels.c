#include <stdio.h>
#include <string.h>
#include <ctype.h>

int count_vowels(char name[]) {
    int i;
    int n = 0;

    for (i = 0; i < (int)strlen(name); i++) {
        if (tolower((unsigned char)name[i]) == 'a' ||
            tolower((unsigned char)name[i]) == 'e' ||
            tolower((unsigned char)name[i]) == 'i' ||
            tolower((unsigned char)name[i]) == 'o' ||
            tolower((unsigned char)name[i]) == 'u') {
            n++;
        }
    }

    return n;
}

int main(void) {
    char name[50];

    printf("Enter your name: ");
    scanf("%49s", name);

    printf("Your name has %d vowels.\n", count_vowels(name));

    return 0;
}
