/* humanity: Multi-level inheritance chain is represented by a single        */
/* Human struct carrying an era enum. The overloaded say() methods become     */
/* say_alone() and say_to(). The template fight<T>() becomes fight().        */
#include <stdio.h>

typedef enum {
    ERA_AUSTRALOPITHECUS,
    ERA_HOMO_HABILIS,
    ERA_HOMO_ERECTUS,
    ERA_HOMO_SAPIENS,
    ERA_HOMO_NEANDERTHALENSIS
} HumanEra;

typedef struct {
    HumanEra era;
    char name[50];
} Human;

void human_init(Human *h, HumanEra era, const char *name) {
    int i;
    h->era = era;
    for (i = 0; name[i] && i < 49; i++) h->name[i] = name[i];
    h->name[i] = '\0';
}

void human_fight(Human *attacker, Human *defender) {
    printf("%s fought with %s.\n", attacker->name, defender->name);
}

void human_say(Human *speaker, const char *s) {
    printf("%s said \"%s\".\n", speaker->name, s);
}

void human_say_to(Human *speaker, const char *s, Human *listener) {
    printf("%s said \"%s\" to %s.\n", speaker->name, s, listener->name);
}

int main(void) {
    Human fred;
    Human adam;

    human_init(&fred, ERA_HOMO_NEANDERTHALENSIS, "Fred");
    human_init(&adam, ERA_HOMO_SAPIENS,          "Adam");

    human_say(&adam, "What a lovely day!");
    human_say_to(&adam, "Who are you?", &fred);
    human_fight(&fred, &adam);

    return 0;
}
