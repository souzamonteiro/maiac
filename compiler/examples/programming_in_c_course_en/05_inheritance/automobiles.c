/* automobiles: Car/Truck/Tractor all share the same data fields as          */
/* Automobile. In C we use a single struct with a type tag (enum) to         */
/* distinguish between subtypes without code duplication.                    */
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
} Automobile;

void automobile_init(Automobile *a, VehicleType type,
                     const char *color, int year, const char *model,
                     float engine_size, float price) {
    int i;
    a->type = type;
    for (i = 0; color[i] && i < 31; i++) a->color[i] = color[i];
    a->color[i] = '\0';
    for (i = 0; model[i] && i < 31; i++) a->model[i] = model[i];
    a->model[i] = '\0';
    a->year = year;
    a->engine_size = engine_size;
    a->price = price;
}

int main(void) {
    Automobile etios;
    Automobile actros;
    Automobile mf3400;

    automobile_init(&etios,  VEHICLE_CAR,     "Silver", 2021, "XL",     1.4f, 50000.0f);
    automobile_init(&actros, VEHICLE_TRUCK,   "Red",    2022, "X",      6.0f, 500000.0f);
    automobile_init(&mf3400, VEHICLE_TRACTOR, "Blue",   2022, "MF 3400",3.0f, 75000.0f);

    printf("The tractor %s year %d costs $%.0f.\n",
           mf3400.model, mf3400.year, mf3400.price);

    return 0;
}
