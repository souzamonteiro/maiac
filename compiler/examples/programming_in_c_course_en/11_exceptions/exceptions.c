/* exceptions: C has no throw/try/catch.                                   */
/* Equivalent pattern: function returns status/error codes and caller checks. */
#include <stdio.h>

typedef enum {
    ERR_OK = 0,
    ERR_INT = 1,
    ERR_STRING = 2
} ErrorCode;

ErrorCode do_work(int trigger_string_error, int *int_error_value, char *msg, int msg_size) {
    int i;

    if (trigger_string_error) {
        const char *src = "Oops!";
        for (i = 0; i < msg_size - 1 && src[i]; i++) {
            msg[i] = src[i];
        }
        msg[i] = '\0';
        return ERR_STRING;
    }

    *int_error_value = 20;
    return ERR_INT;
}

int main(void) {
    ErrorCode err;
    int int_error_value;
    char string_error_msg[64];

    err = do_work(1, &int_error_value, string_error_msg, 64);

    if (err == ERR_INT) {
        printf("An error occurred: %d.\n", int_error_value);
    } else if (err == ERR_STRING) {
        printf("An error occurred: %s.\n", string_error_msg);
    }

    return 0;
}
