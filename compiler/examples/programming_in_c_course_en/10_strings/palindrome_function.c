#include <stdio.h>
#include <string.h>

int is_palindrome(char word[]) {
    int i;
    int j;
    int result = 1;

    j = (int)strlen(word) - 1;
    for (i = 0; i < (int)strlen(word); i++) {
        if (word[i] != word[j]) {
            result = 0;
        }
        j--;
    }

    return result;
}

int main(void) {
    char word[50];

    printf("Enter a word: ");
    scanf("%49s", word);

    if (is_palindrome(word)) {
        printf("The word is a palindrome!");
    } else {
        printf("The word is not a palindrome!");
    }

    return 0;
}
