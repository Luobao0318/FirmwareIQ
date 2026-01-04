import { CodeLanguage, ProjectFile, STM32Series } from "./types";

const MAIN_H = `/* main.h */
#ifndef __MAIN_H
#define __MAIN_H

#include "stm32f4xx_hal.h"

void Error_Handler(void);

#endif /* __MAIN_H */
`;

const MAIN_C = `#include "main.h"

/* Private variables ---------------------------------------------------------*/
UART_HandleTypeDef huart2;

/* Private function prototypes -----------------------------------------------*/
void SystemClock_Config(void);
static void MX_GPIO_Init(void);
static void MX_USART2_UART_Init(void);

/**
  * @brief  The application entry point.
  * @retval int
  */
int main(void)
{
  /* Reset of all peripherals, Initializes the Flash interface and the Systick. */
  HAL_Init();

  /* Configure the system clock */
  SystemClock_Config();

  /* Initialize all configured peripherals */
  MX_GPIO_Init();
  MX_USART2_UART_Init();

  /* Infinite loop */
  while (1)
  {
    // INTENTIONAL BUG: Blocking delay inside critical section if interrupts were disabled
    HAL_Delay(1000);
    
    // SYNTAX ERROR: Missing semicolon
    HAL_GPIO_TogglePin(GPIOA, GPIO_PIN_5) // Toggling LED on PA5
    
    // LOGIC CHECK: Are we handling the UART error?
    HAL_UART_Transmit(&huart2, "Hello", 5, 100);
  }
}`;

export const DEFAULT_FILES: ProjectFile[] = [
  { name: 'main.c', content: MAIN_C, language: CodeLanguage.C },
  { name: 'main.h', content: MAIN_H, language: CodeLanguage.C },
];

export const STM32_SERIES_OPTIONS = Object.values(STM32Series);
