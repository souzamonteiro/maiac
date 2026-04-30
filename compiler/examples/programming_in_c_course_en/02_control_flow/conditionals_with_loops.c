#include <stdio.h>

int main(void) {
    int a;
    int b;
    char answer;
    int continue_loop = 1;

    while (continue_loop) {
        printf("Enter the value of the first variable: ");
        scanf("%d", &a);
        printf("Enter the value of the second variable: ");
        scanf("%d", &b);

        if (a < b) {
            printf("The first variable is less than the second!\n");
        } else if (a > b) {
            printf("The first variable is greater than the second!\n");
        } else {
            printf("Both variables are equal!\n");
        }

        printf("Continue (y/n): ");
        scanf(" %c", &answer);

        switch (answer) {
            case 'y':
            case 'Y':
                continue_loop = 1;
                break;
            case 'n':
            case 'N':
                continue_loop = 0;
                break;
            default:
                printf("Invalid option!\n");
        }
    }

    printf("Program finished!\n");

    return 0;
}
