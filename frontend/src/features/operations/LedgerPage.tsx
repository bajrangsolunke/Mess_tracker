import { useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  CircularProgress,
  Paper,
  Stack,
  Chip,
} from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { useLedgerReport, useCreateLedgerEntry } from "../../api/useOperations";
import type { LedgerKind } from "../../api/types";

export function LedgerPage() {
  const [dateRange, setDateRange] = useState({
    from: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0],
    to: new Date().toISOString().split("T")[0],
  });

  const [openDialog, setOpenDialog] = useState(false);
  const [formData, setFormData] = useState({
    kind: "expense" as LedgerKind,
    amount: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
    note: "",
  });

  const { data: report, isLoading } = useLedgerReport(dateRange.from, dateRange.to);
  const createEntry = useCreateLedgerEntry();

  const handleOpenDialog = () => {
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setFormData({
      kind: "expense",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      description: "",
      note: "",
    });
  };

  const handleSave = async () => {
    try {
      await createEntry.mutateAsync({
        kind: formData.kind,
        amount: formData.amount,
        date: formData.date,
        description: formData.description,
        note: formData.note || null,
      });
      handleCloseDialog();
    } catch (error) {
      console.error("Error creating ledger entry:", error);
    }
  };

  const getKindLabel = (kind: LedgerKind) => {
    const labels: Record<LedgerKind, string> = {
      income: "Income",
      expense: "Expense",
      staff_advance: "Staff Advance",
      salary_payment: "Salary Payment",
      advance_repayment: "Advance Repayment",
    };
    return labels[kind];
  };

  if (isLoading && !report) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Stack spacing={3}>
        {/* Summary Cards */}
        {report && (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Box sx={{ flex: 1 }}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Income
                  </Typography>
                  <Typography variant="h6" sx={{ color: "success.main" }}>
                    ₹{parseFloat(report.totals.income).toFixed(2)}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Expense
                  </Typography>
                  <Typography variant="h6" sx={{ color: "error.main" }}>
                    ₹{parseFloat(report.totals.expense).toFixed(2)}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Staff Advance
                  </Typography>
                  <Typography variant="h6" sx={{ color: "warning.main" }}>
                    ₹{parseFloat(report.totals.staff_advance).toFixed(2)}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
            <Box sx={{ flex: 1 }}>
              <Card>
                <CardContent>
                  <Typography color="textSecondary" gutterBottom>
                    Net
                  </Typography>
                  <Typography
                    variant="h6"
                    sx={{
                      color:
                        parseFloat(report.totals.net) >= 0
                          ? "success.main"
                          : "error.main",
                    }}
                  >
                    ₹{parseFloat(report.totals.net).toFixed(2)}
                  </Typography>
                </CardContent>
              </Card>
            </Box>
          </Stack>
        )}

        {/* Filters and Actions */}
        <Card>
          <CardContent>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="From Date"
                type="date"
                value={dateRange.from}
                onChange={(e) =>
                  setDateRange({ ...dateRange, from: e.target.value })
                }
                slotProps={{
                  inputLabel: { shrink: true },
                }}
                size="small"
              />
              <TextField
                label="To Date"
                type="date"
                value={dateRange.to}
                onChange={(e) =>
                  setDateRange({ ...dateRange, to: e.target.value })
                }
                slotProps={{
                  inputLabel: { shrink: true },
                }}
                size="small"
              />
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleOpenDialog}
              >
                Add Entry
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {/* Entries Table */}
        <Card>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Ledger Entries
            </Typography>
            {report && report.entries.length > 0 ? (
              <Paper sx={{ overflowX: "auto" }}>
                <Table>
                  <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Type</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Note</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {report.entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>
                          {new Date(entry.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={getKindLabel(entry.kind)}
                            size="small"
                            variant="outlined"
                            sx={{
                              backgroundColor:
                                entry.kind === "income" ||
                                entry.kind === "advance_repayment"
                                  ? "success.light"
                                  : entry.kind === "expense"
                                    ? "error.light"
                                    : entry.kind === "staff_advance"
                                      ? "warning.light"
                                      : "info.light",
                              color:
                                entry.kind === "income" ||
                                entry.kind === "advance_repayment"
                                  ? "success.main"
                                  : entry.kind === "expense"
                                    ? "error.main"
                                    : entry.kind === "staff_advance"
                                      ? "warning.main"
                                      : "info.main",
                            }}
                          />
                        </TableCell>
                        <TableCell>{entry.description}</TableCell>
                        <TableCell>
                          <Typography
                            sx={{
                              color:
                                entry.kind === "income" ||
                                entry.kind === "advance_repayment"
                                  ? "success.main"
                                  : "error.main",
                            }}
                          >
                            ₹{parseFloat(entry.amount).toFixed(2)}
                          </Typography>
                        </TableCell>
                        <TableCell>{entry.note || "-"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Paper>
            ) : (
              <Typography sx={{ color: "textSecondary", textAlign: "center", py: 4 }}>
                No ledger entries for this date range
              </Typography>
            )}
          </CardContent>
        </Card>
      </Stack>

      {/* Add Entry Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Add Ledger Entry</DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <FormControl fullWidth margin="normal">
            <InputLabel>Type</InputLabel>
            <Select
              value={formData.kind}
              onChange={(e) =>
                setFormData({ ...formData, kind: e.target.value as LedgerKind })
              }
              label="Type"
            >
              <MenuItem value="income">Income</MenuItem>
              <MenuItem value="expense">Expense</MenuItem>
              <MenuItem value="staff_advance">Staff Advance</MenuItem>
              <MenuItem value="salary_payment">Salary Payment</MenuItem>
              <MenuItem value="advance_repayment">Advance Repayment</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            margin="normal"
            slotProps={{
              inputLabel: { shrink: true },
            }}
          />
          <TextField
            fullWidth
            label="Amount"
            type="number"
            value={formData.amount}
            onChange={(e) =>
              setFormData({ ...formData, amount: e.target.value })
            }
            margin="normal"
            slotProps={{
              input: {
                startAdornment: "₹",
              },
            }}
          />
          <TextField
            fullWidth
            label="Description"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            margin="normal"
          />
          <TextField
            fullWidth
            label="Note (optional)"
            value={formData.note}
            onChange={(e) =>
              setFormData({ ...formData, note: e.target.value })
            }
            margin="normal"
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            disabled={createEntry.isPending || !formData.amount || !formData.description}
          >
            Add Entry
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
