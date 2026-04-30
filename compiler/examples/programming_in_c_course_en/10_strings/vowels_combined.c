#include <stdio.h>
#include <string.h>
#include <ctype.h>

int count_vowels_with_repeat(char name[]) {
    int i;
    int n = 0;

    for (i = 0; i < (int)strlen(name); i++) {
        switch (tolower((unsigned char)name[i])) {
            case 'a':
            case 'e':
            case 'i':
            case 'o':
            case 'u':
                n++;
                break;
            default:
                break;
        }
    }

    return n;
}

int count_vowels_no_repeat(char name[]) {
    int i;
    int na = 0;
    int ne = 0;
    int ni = 0;
    int no = 0;
    int nu = 0;

    for (i = 0; i < (int)strlen(name); i++) {
        switch (tolower((unsigned char)name[i])) {
            case 'a': if (na == 0) na++; break;
            case 'e': if (ne == 0) ne++; break;
            case 'i': if (ni == 0) ni++; break;
            case 'o': if (no == 0) no++; break;
            case 'u': if (nu == 0) nu++; break;
            default: break;
        }
    }

    return na + ne + ni + no + nu;
}

int main(void) {
    char name[50];

    printf("Enter your name: ");
    scanf("%49s", name);

    printf("Your name has %d vowels (with repetition).\n", count_vowels_with_repeat(name));
    printf("Your name has %d vowels (without repetition).\n", count_vowels_no_repeat(name));

    return 0;
}
