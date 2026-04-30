#include <stdio.h>
#include <string.h>

int main(void) {
    int i;
    int j;
    char word[255];
    int is_palindrome;

    printf("Enter a word: ");
    scanf("%254s", word);
    printf("\n");

    i = 0;
    j = (int)strlen(word) - 1;

    is_palindrome = 1;

    while (i < (int)strlen(word)) {
        if (word[i] != word[j]) {
            is_palindrome = 0;
            break;
        }
        if (i == j) {
            break;
        }
        i++;
        j--;
    }

    if (is_palindrome) {
        printf("The word is a palindrome!");
    } else {
        printf("The word is not a palindrome!");
    }
    return 0;
}
