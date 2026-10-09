import { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  IconButton,
  Tooltip,
  Paper,
} from "@mui/material";
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { useListStaff, useCreateStaff, useUpdateStaff } from "../../api/useOperations";

export function StaffPage() {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    monthly_salary: "",
  });

  const { data: staffList, isLoading, isError } = useListStaff();
  const createStaff = useCreateStaff();
  const updateStaff = useUpdateStaff();

  const handleOpenDialog = () => {
    setFormData({ name: "", phone: "", monthly_salary: "" });
    setEditingId(null);
    setOpen(true);
  };

  const handleCloseDialog = () => {
    setOpen(false);
  };

  const handleEditStaff = (staff: any) => {
    setFormData({
      name: staff.name,
      phone: staff.phone,
      monthly_salary: staff.monthly_salary,
    });
    setEditingId(staff.id);
    setOpen(true);
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        await updateStaff.mutateAsync({ ...formData, id: editingId });
      } else {
        await createStaff.mutateAsync(formData);
      }
      handleCloseDialog();
    } catch (error) {
      console.error("Error saving staff:", error);
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "400px" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError) {
    return (
      <Alert severity="error">Failed to load staff list. Please try again.</Alert>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Card>
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
            <Typography variant="h5">Staff Members</Typography>
            <Button variant="contained" color="primary" onClick={handleOpenDialog}>
              Add Staff
            </Button>
          </Box>

          <Paper sx={{ overflowX: "auto" }}>
            <Table>
              <TableHead sx={{ backgroundColor: "#f5f5f5" }}>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Phone</TableCell>
                  <TableCell>Monthly Salary</TableCell>
                  <TableCell>Joined Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {staffList && staffList.length > 0 ? (
                  staffList.map((staff) => (
                    <TableRow key={staff.id}>
                      <TableCell>{staff.name}</TableCell>
                      <TableCell>{staff.phone}</TableCell>
                      <TableCell>₹{parseFloat(staff.monthly_salary).toFixed(2)}</TableCell>
                      <TableCell>{new Date(staff.joined_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {staff.is_active ? (
                          <Typography color="success">Active</Typography>
                        ) : (
                          <Typography color="error">Inactive</Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => handleEditStaff(staff)}
                            color="primary"
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton size="small" color="error">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} align="center">
                      No staff members yet
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Paper>
        </CardContent>
      </Card>

      <Dialog open={open} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingId ? "Edit Staff Member" : "Add New Staff Member"}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <TextField
            fullWidth
            label="Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Monthly Salary"
            type="number"
            value={formData.monthly_salary}
            onChange={(e) =>
              setFormData({ ...formData, monthly_salary: e.target.value })
            }
            margin="normal"
            slotProps={{
              input: {
                startAdornment: "₹",
              },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            loading={createStaff.isPending || updateStaff.isPending}
          >
            {editingId ? "Update" : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
