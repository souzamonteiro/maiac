#include <stdio.h>
#include <string.h>

int main(void) {
    char word[50];
    int i;
    int j;
    int is_palindrome = 1;

    printf("Enter a word: ");
    scanf("%49s", word);

    j = (int)strlen(word) - 1;
    for (i = 0; i < (int)strlen(word); i++) {
        if (word[i] != word[j]) {
            is_palindrome = 0;
        }
        j--;
    }

    if (is_palindrome) {
        printf("The word is a palindrome!");
    } else {
        printf("The word is not a palindrome!");
    }

    return 0;
}
