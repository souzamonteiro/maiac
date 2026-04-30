#include <stdio.h>

int main(void) {
    int age;
    char gender;

    printf("Enter your age: ");
    scanf("%d", &age);

    if (age > 18) {                                       /* The if statement executes the corresponding */
        printf("You are older than 18.\n");               /* block of code if the condition is true. */
    } else if (age < 18) {                                /* An else if block executes if its condition */
        printf("You are younger than 18.\n");             /* is evaluated as true. */
    } else {                                              /* An else block executes if none of the */
        printf("You are 18 years old.\n");                /* conditions were evaluated as true. */
    }

    printf("Enter your gender (M/F): ");
    scanf(" %c", &gender);   /* Space before %c skips any pending whitespace. */

    switch (gender) {                              /* A switch statement compares a value against */
        case 'm':                                  /* multiple fixed case values. */
        case 'M':
            printf("You are male.\n");
            break;
        case 'f':
        case 'F':
            printf("You are female.\n");
            break;
        default:                                   /* The default case executes if none of the cases match. */
            printf("Gender undefined.\n");
    }

    return 0;
}
