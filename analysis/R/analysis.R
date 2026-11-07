# India Cybercrime Intelligence Portal - DataDefenders
# Reproduces the project's statistics from data/processed and writes analysis/outputs.
# Run from the project root:  Rscript analysis/R/analysis.R
#
# Principles enforced here:
#  * NCRB cases, NCRP complaints, CERT-In incidents and RBI frauds are never combined.
#  * Missing values stay NA. They are never treated as zero.
#  * Rates use NCRB's own printed mid-year population for that state and year.

local_lib <- file.path(getwd(), ".tools", "Rlib")
if (dir.exists(local_lib)) .libPaths(c(local_lib, .libPaths()))

suppressPackageStartupMessages({
  library(dplyr)
  library(tidyr)
  library(readr)
  library(ggplot2)
  library(sf)
  library(forecast)
})

processed <- "data/processed"
outputs <- "analysis/outputs"
figures <- file.path(outputs, "figures")
dir.create(figures, recursive = TRUE, showWarnings = FALSE)

read_quiet <- function(name) read_csv(file.path(processed, name), show_col_types = FALSE)

cases <- read_quiet("ncrb_state_cases.csv")
national <- read_quiet("ncrb_national_cases.csv")
population <- read_quiet("ncrb_population.csv")
heads <- read_quiet("ncrb_crime_heads.csv")
motives <- read_quiet("ncrb_motives.csv")
ncrp <- read_quiet("ncrp_national.csv")
ncrp_state <- read_quiet("ncrp_state_2023.csv")
cert_in <- read_quiet("cert_in_incidents.csv")

# Regions and labels are maintained in one place, by the Python pipeline.
states <- read_quiet("states.csv")

# Requirement 4A: year-over-year growth --------------------------------------------
growth_pct <- function(current, previous) {
  ifelse(is.na(previous) | previous == 0, NA_real_, (current - previous) / previous * 100)
}

national_yoy <- national |>
  arrange(year) |>
  mutate(yoy_pct = growth_pct(cases, lag(cases))) |>
  select(year, cases, yoy_pct)
write_csv(national_yoy, file.path(outputs, "national_yoy.csv"))

# Requirements 4B and 4C: rate per 100,000 and national share ------------------------
state_metrics <- cases |>
  select(state_code, year, cases) |>
  left_join(filter(population, state_code != "IN") |>
              select(state_code, year, population_lakh), by = c("state_code", "year")) |>
  left_join(select(national, year, national_cases = cases), by = "year") |>
  group_by(state_code) |>
  arrange(year, .by_group = TRUE) |>
  mutate(
    rate_per_100k = cases / (population_lakh * 100000) * 100000,
    share_pct = cases / national_cases * 100,
    yoy_pct = growth_pct(cases, lag(cases)),
    # J&K and Ladakh were split in the 2020 edition, so 2020 growth is not comparable.
    yoy_pct = ifelse(state_code %in% c("JK", "LA") & year == 2020, NA_real_, yoy_pct)
  ) |>
  ungroup() |>
  left_join(select(states, state_code, state_name, region), by = "state_code")
write_csv(state_metrics, file.path(outputs, "state_metrics.csv"))

latest_year <- max(cases$year)
latest <- filter(state_metrics, year == latest_year)
write_csv(slice_max(latest, cases, n = 10), file.path(outputs, "top10_by_cases.csv"))
write_csv(slice_max(latest, rate_per_100k, n = 10), file.path(outputs, "top10_by_rate.csv"))

regional <- state_metrics |>
  group_by(region, year) |>
  summarise(
    cases = sum(cases, na.rm = TRUE),
    population_lakh = sum(population_lakh, na.rm = TRUE),
    .groups = "drop"
  ) |>
  mutate(rate_per_100k = cases / population_lakh)
write_csv(regional, file.path(outputs, "regional.csv"))

# Requirement 4E: crime-head distribution and growth --------------------------------
level_one <- read_quiet("crime_heads_meta.csv") |> filter(level == 1)
head_dist <- heads |>
  filter(state_code == "IN", head_id %in% level_one$head_id) |>
  group_by(year) |>
  mutate(share_pct = cases / sum(cases, na.rm = TRUE) * 100) |>
  ungroup() |>
  select(year, head_id, cases, share_pct)
write_csv(head_dist, file.path(outputs, "crime_head_distribution.csv"))

head_growth <- heads |>
  filter(state_code == "IN", year %in% c(2021, 2024), !is.na(cases)) |>
  select(head_id, year, cases) |>
  pivot_wider(names_from = year, values_from = cases, names_prefix = "y") |>
  filter(!is.na(y2021), !is.na(y2024), y2021 >= 50) |>
  mutate(cagr_2021_2024_pct = ((y2024 / y2021)^(1 / 3) - 1) * 100) |>
  arrange(desc(cagr_2021_2024_pct))
write_csv(head_growth, file.path(outputs, "crime_head_growth.csv"))

motive_dist <- motives |>
  filter(state_code == "IN", motive_id != "total") |>
  group_by(year) |>
  mutate(share_pct = cases / sum(cases, na.rm = TRUE) * 100) |>
  ungroup() |>
  select(year, motive_id, cases, share_pct)
write_csv(motive_dist, file.path(outputs, "motive_distribution.csv"))

# Requirement 4D: financial impact. NCRP only. An average per NCRP complaint is valid
# because amount and complaints come from the same table. Dividing by NCRB cases is not.
ncrp_summary <- ncrp |>
  arrange(year) |>
  mutate(
    amount_yoy_pct = growth_pct(amount_crore, lag(amount_crore)),
    complaints_yoy_pct = growth_pct(complaints, lag(complaints)),
    avg_reported_per_complaint_inr = amount_crore * 1e7 / complaints
  )
write_csv(ncrp_summary, file.path(outputs, "ncrp_summary.csv"))

ncrp_state_summary <- ncrp_state |>
  mutate(
    avg_reported_per_complaint_inr = amount_crore * 1e7 / complaints,
    lien_share_pct = lien_crore / amount_crore * 100
  ) |>
  left_join(select(states, state_code, state_name), by = "state_code") |>
  arrange(desc(amount_crore))
write_csv(ncrp_state_summary, file.path(outputs, "ncrp_state_2023_summary.csv"))

cert_in_summary <- cert_in |>
  arrange(year) |>
  mutate(yoy_pct = growth_pct(incidents, lag(incidents)))
write_csv(cert_in_summary, file.path(outputs, "cert_in_summary.csv"))

# Forecasting -----------------------------------------------------------------------
# Nine annual points are few, so the model is chosen by out-of-sample error, not by
# in-sample fit. Each candidate is re-fitted at several origins and scored on the
# published years it had not seen. ARIMA is excluded from selection because the
# earliest origins have too few points for it to be estimated meaningfully.
series <- national |> arrange(year) |> select(year, cases)

as_interval <- function(fit, log_scale = FALSE) {
  list(mean = as.numeric(fit$mean), lower = as.numeric(fit$lower), upper = as.numeric(fit$upper))
}

lm_forecast <- function(train, h, use_log) {
  fit <- if (use_log) lm(log(cases) ~ year, data = train) else lm(cases ~ year, data = train)
  future <- data.frame(year = max(train$year) + seq_len(h))
  pred <- predict(fit, newdata = future, interval = "prediction", level = 0.95)
  back <- if (use_log) exp else identity
  list(mean = back(pred[, "fit"]), lower = back(pred[, "lwr"]), upper = back(pred[, "upr"]))
}

candidates <- list(
  "Log-linear trend" = function(train, h) lm_forecast(train, h, TRUE),
  "Linear trend" = function(train, h) lm_forecast(train, h, FALSE),
  "Random walk with drift" = function(train, h) {
    as_interval(rwf(ts(train$cases), h = h, drift = TRUE, level = 95))
  },
  "Random walk with drift (log scale)" = function(train, h) {
    as_interval(rwf(ts(train$cases), h = h, drift = TRUE, level = 95, lambda = 0, biasadj = FALSE))
  },
  "Holt linear trend" = function(train, h) {
    as_interval(holt(ts(train$cases), h = h, level = 95, initial = "simple"))
  }
)

origins <- 2020:2023
evaluate <- function(name, fn) {
  rows <- list()
  for (origin in origins) {
    train <- filter(series, year <= origin)
    test <- filter(series, year > origin) |> slice_head(n = 3)
    fc <- tryCatch(fn(train, nrow(test)), error = function(e) NULL)
    if (is.null(fc)) next
    rows[[length(rows) + 1]] <- test |>
      mutate(
        model = name, origin = origin, horizon = year - origin,
        predicted = as.numeric(fc$mean),
        error_pct = (predicted - cases) / cases * 100,
        covered = cases >= as.numeric(fc$lower) & cases <= as.numeric(fc$upper)
      )
  }
  bind_rows(rows)
}
backtests <- bind_rows(mapply(evaluate, names(candidates), candidates, SIMPLIFY = FALSE))
write_csv(backtests, file.path(outputs, "forecast_backtests_all.csv"))

model_scores <- backtests |>
  group_by(model) |>
  summarise(
    mape = mean(abs(error_pct)),
    mean_error_pct = mean(error_pct),
    interval_coverage_pct = mean(covered) * 100,
    n_forecasts = n(),
    .groups = "drop"
  ) |>
  arrange(mape)
selected <- model_scores$model[1]
model_scores <- mutate(model_scores, selected = model == selected)
write_csv(model_scores, file.path(outputs, "forecast_model_scores.csv"))

final <- candidates[[selected]](series, 3)
forecast_tbl <- data.frame(
  year = latest_year + 1:3,
  predicted = as.numeric(final$mean),
  lower_95 = as.numeric(final$lower),
  upper_95 = as.numeric(final$upper),
  model = selected
)
write_csv(forecast_tbl, file.path(outputs, "forecast_ncrb.csv"))

# The chart shows the selected model's forecast made from the 2021 origin.
backtest <- backtests |>
  filter(model == selected, origin == 2021) |>
  select(year, cases, predicted, error_pct)
write_csv(backtest, file.path(outputs, "forecast_backtest.csv"))

arima_fit <- auto.arima(ts(log(series$cases), start = min(series$year)),
                        seasonal = FALSE, stepwise = FALSE, approximation = FALSE)
model_summary <- c(
  sprintf("Observations: %d (%d-%d)", nrow(series), min(series$year), max(series$year)),
  sprintf("Selected by rolling-origin backtest: %s (MAPE %.1f%%)", selected, model_scores$mape[1]),
  sprintf("auto.arima on log cases, comparison only: ARIMA(%s)",
          paste(arimaorder(arima_fit), collapse = ",")),
  "NCRP amount and CERT-In incidents are deliberately not forecast: see methodology."
)
writeLines(model_summary, file.path(outputs, "forecast_model_summary.txt"))
print(as.data.frame(model_scores))
print(forecast_tbl)

# Figures ---------------------------------------------------------------------------
theme_set(theme_minimal(base_size = 12))

ggsave(file.path(figures, "national_trend.png"),
       ggplot(series, aes(year, cases)) +
         geom_col(fill = "#0e7490") +
         scale_x_continuous(breaks = series$year) +
         scale_y_continuous(labels = scales::comma) +
         labs(title = "Cyber crime cases registered in India",
              subtitle = "NCRB Crime in India, latest published value for each year",
              x = NULL, y = "Cases registered"),
       width = 8, height = 4.5, dpi = 150)

ggsave(file.path(figures, "top10_rate.png"),
       ggplot(slice_max(latest, rate_per_100k, n = 10),
              aes(rate_per_100k, reorder(state_name, rate_per_100k))) +
         geom_col(fill = "#b91c1c") +
         labs(title = sprintf("Highest cyber crime rates, %d", latest_year),
              subtitle = "Cases per 100,000 population, NCRB", x = "Rate", y = NULL),
       width = 8, height = 4.5, dpi = 150)

# Requirement: geographic analysis with sf.
boundaries <- st_read("data/geo/india_states.geojson", quiet = TRUE) |>
  left_join(select(latest, state_code, rate_per_100k), by = "state_code")
ggsave(file.path(figures, "map_rate.png"),
       ggplot(boundaries) +
         geom_sf(aes(fill = rate_per_100k), colour = "white", linewidth = 0.1) +
         scale_fill_distiller(palette = "YlOrRd", direction = 1, trans = "sqrt",
                              na.value = "grey80", name = "Rate") +
         labs(title = sprintf("Cyber crime rate per 100,000, %d", latest_year),
              subtitle = "NCRB. Boundaries: DataMeet (CC BY 2.5 IN), indicative only") +
         theme_void(),
       width = 7, height = 8, dpi = 150)

cat(model_summary, sep = "\n")
cat("\nR analysis complete. Outputs in", outputs, "\n")
