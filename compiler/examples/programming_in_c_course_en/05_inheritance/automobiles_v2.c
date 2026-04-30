/* automobiles_v2: Extended version with optional extras (AC, power steering). */
#include <stdio.h>

typedef enum {
    VEHICLE_CAR,
    VEHICLE_TRUCK,
    VEHICLE_TRACTOR
} VehicleType;

typedef struct {
    VehicleType type;
    char color[32];
    int year;
    char model[32];
    float engine_size;
    float price;
    float ac;
    float steering;
} Automobile;

void automobile_init(Automobile *a, VehicleType type,
                     const char *color, int year, const char *model,
                     float engine_size, float price, float ac, float steering) {
    int i;
    a->type = type;
    for (i = 0; color[i] && i < 31; i++) a->color[i] = color[i];
    a->color[i] = '\0';
    for (i = 0; model[i] && i < 31; i++) a->model[i] = model[i];
    a->model[i] = '\0';
    a->year = year;
    a->engine_size = engine_size;
    a->price = price;
    a->ac = ac;
    a->steering = steering;
}

int main(void) {
    Automobile etios;
    Automobile actros;
    Automobile mf3400;
    int vehicle_type;
    char want_ac;
    char want_steering;
    float total_price;
    char model[32];
    int i;

    automobile_init(&etios,  VEHICLE_CAR,     "Silver", 2021, "XL",      1.4f, 50000.0f,  2000.0f,  3000.0f);
    automobile_init(&actros, VEHICLE_TRUCK,   "Red",    2022, "X",       6.0f, 500000.0f, 20000.0f, 30000.0f);
    automobile_init(&mf3400, VEHICLE_TRACTOR, "Blue",   2022, "MF 3400", 3.0f, 75000.0f,  3000.0f,  4000.0f);

    total_price = 0.0f;
    model[0] = '\0';

    printf("Build your vehicle:\n");
    printf("Would you like to buy a car (1), truck (2) or tractor (3)? ");
    scanf("%d", &vehicle_type);
    printf("\nWould you like a vehicle with air conditioning (y/n)? ");
    scanf(" %c", &want_ac);
    printf("\nWould you like a vehicle with power steering (y/n)? ");
    scanf(" %c", &want_steering);

    switch (vehicle_type) {
        case 1:
            for (i = 0; etios.model[i]; i++) model[i] = etios.model[i];
            model[i] = '\0';
            total_price = etios.price;
            if (want_ac == 'y')       total_price += etios.ac;
            if (want_steering == 'y') total_price += etios.steering;
            break;
        case 2:
            for (i = 0; actros.model[i]; i++) model[i] = actros.model[i];
            model[i] = '\0';
            total_price = actros.price;
            if (want_ac == 'y')       total_price += actros.ac;
            if (want_steering == 'y') total_price += actros.steering;
            break;
        case 3:
            for (i = 0; mf3400.model[i]; i++) model[i] = mf3400.model[i];
            model[i] = '\0';
            total_price = mf3400.price;
            if (want_ac == 'y')       total_price += mf3400.ac;
            if (want_steering == 'y') total_price += mf3400.steering;
            break;
        default:
            printf("Invalid option!");
            return 0;
    }

    printf("The vehicle %s costs $%.0f.\n", model, total_price);

    return 0;
}
