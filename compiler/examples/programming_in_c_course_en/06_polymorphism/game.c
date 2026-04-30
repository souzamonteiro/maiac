/* game: Simplified C89 adaptation focused on robust MaiaC testing.
 * The original C++ version uses deep class hierarchies and methods.
 * Here we model entities with structs + function pointers.
 */
#include <stdio.h>

typedef struct Character Character;

struct Character {
    char name[32];
    int health;
    int attack;
    int defense;
    int (*perform_attack)(Character *self, Character *enemy);
};

void copy_text(char *dest, const char *src, int max_len) {
    int i;
    for (i = 0; i < max_len - 1 && src[i]; i++) {
        dest[i] = src[i];
    }
    dest[i] = '\0';
}

int default_attack(Character *self, Character *enemy) {
    int damage;

    damage = self->attack - enemy->defense;
    if (damage < 1) {
        damage = 1;
    }

    enemy->health -= damage;
    if (enemy->health < 0) {
        enemy->health = 0;
    }

    printf("%s attacks %s and deals %d damage.\n", self->name, enemy->name, damage);
    return damage;
}

void character_init(Character *c, const char *name, int health, int attack, int defense) {
    copy_text(c->name, name, 32);
    c->health = health;
    c->attack = attack;
    c->defense = defense;
    c->perform_attack = default_attack;
}

void print_status(Character *a, Character *b) {
    printf("Status -> %s: %d HP | %s: %d HP\n", a->name, a->health, b->name, b->health);
}

int main(void) {
    Character knight;
    Character dragon;
    int turn;

    printf("=== The Last Kingdom (C89 Edition) ===\n");

    character_init(&knight, "Arthur", 40, 10, 3);
    character_init(&dragon, "Tiamat", 55, 12, 2);

    print_status(&knight, &dragon);

    turn = 1;
    while (knight.health > 0 && dragon.health > 0) {
        printf("\nTurn %d\n", turn);

        knight.perform_attack(&knight, &dragon);
        if (dragon.health == 0) {
            break;
        }

        dragon.perform_attack(&dragon, &knight);

        print_status(&knight, &dragon);
        turn++;
    }

    printf("\n=== Battle Result ===\n");
    if (knight.health > 0) {
        printf("%s wins!\n", knight.name);
    } else {
        printf("%s wins!\n", dragon.name);
    }

    return 0;
}
