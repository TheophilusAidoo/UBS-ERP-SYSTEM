import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Tooltip,
  useTheme,
  Card,
} from '@mui/material';
import { Project } from '../../types';
import { format, differenceInDays, startOfWeek, endOfWeek, addDays, isWithinInterval } from 'date-fns';

interface GanttChartProps {
  projects: Project[];
  startDate?: Date;
  endDate?: Date;
}

const GanttChart: React.FC<GanttChartProps> = ({ projects, startDate, endDate }) => {
  const theme = useTheme();
  
  // Calculate date range
  const now = new Date();
  const defaultStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  const defaultEnd = addDays(defaultStart, 90); // 90 days from start
  
  const chartStart = startDate || defaultStart;
  const chartEnd = endDate || defaultEnd;
  const totalDays = differenceInDays(chartEnd, chartStart);
  
  // Get projects with valid dates
  const validProjects = projects.filter(p => {
    if (!p.startDate || !p.endDate) return false;
    const start = new Date(p.startDate);
    const end = new Date(p.endDate);
    return isWithinInterval(start, { start: chartStart, end: chartEnd }) ||
           isWithinInterval(end, { start: chartStart, end: chartEnd }) ||
           (start <= chartStart && end >= chartEnd);
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return theme.palette.success.main;
      case 'in-progress':
        return theme.palette.info.main;
      case 'on-hold':
        return theme.palette.warning.main;
      case 'cancelled':
        return theme.palette.error.main;
      default:
        return theme.palette.grey[400];
    }
  };

  const calculateBarPosition = (projectStart: Date, projectEnd: Date) => {
    const daysFromStart = differenceInDays(projectStart, chartStart);
    const duration = differenceInDays(projectEnd, projectStart);
    const leftPercent = (daysFromStart / totalDays) * 100;
    // For 0-day projects, use a minimum width of 2px or 0.5% to make it visible
    const minWidthPercent = Math.max(0.5, (2 / (totalDays * 100)) * 100); // At least 2px or 0.5% of chart width
    const widthPercent = duration === 0 ? minWidthPercent : (duration / totalDays) * 100;
    
    return {
      left: `${Math.max(0, leftPercent)}%`,
      width: `${Math.min(100, Math.max(minWidthPercent, widthPercent))}%`,
      duration,
    };
  };

  // Generate week labels
  const weekLabels: Date[] = [];
  let currentDate = new Date(chartStart);
  while (currentDate <= chartEnd) {
    weekLabels.push(new Date(currentDate));
    currentDate = addDays(currentDate, 7);
  }

  return (
    <Card sx={{ borderRadius: 2, border: '1px solid rgba(0,0,0,0.08)', overflow: 'hidden' }}>
      <Box sx={{ 
        p: 3, 
        borderBottom: '1px solid rgba(0,0,0,0.08)',
        backgroundColor: 'background.paper',
      }}>
        <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
          Project Timeline
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Visual overview of project schedules and timelines
        </Typography>
      </Box>
      
      <Box sx={{ p: 3 }}>
        {validProjects.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 6 }}>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 1 }}>
              No projects with valid dates to display
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Projects need both start and end dates to appear on the timeline
            </Typography>
          </Box>
        ) : (
          <Box>
            {/* Header with dates */}
            <Box 
              sx={{ 
                display: 'flex', 
                mb: 3, 
                position: 'relative', 
                height: 50,
                backgroundColor: 'grey.50',
                borderRadius: 1,
                border: '1px solid rgba(0,0,0,0.08)',
                p: 1,
              }}
            >
              {weekLabels.map((week, index) => (
                <Box
                  key={index}
                  sx={{
                    position: 'absolute',
                    left: `${(differenceInDays(week, chartStart) / totalDays) * 100}%`,
                    borderLeft: index > 0 ? '1px solid' : 'none',
                    borderColor: 'divider',
                    height: '100%',
                    pl: index > 0 ? 1.5 : 1,
                    fontSize: '0.75rem',
                    color: 'text.secondary',
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {format(week, 'MMM d')}
                </Box>
              ))}
            </Box>

            {/* Project bars */}
            <Box sx={{ position: 'relative', minHeight: validProjects.length * 70 }}>
            {validProjects.map((project, index) => {
              const projectStart = new Date(project.startDate!);
              const projectEnd = new Date(project.endDate!);
              const { left, width, duration } = calculateBarPosition(projectStart, projectEnd);
              const statusColor = getStatusColor(project.status);
              const isSameDay = duration === 0;

              return (
                  <Box
                    key={project.id}
                    sx={{
                      position: 'relative',
                      height: 60,
                      mb: 2.5,
                      display: 'flex',
                      alignItems: 'center',
                      p: 1,
                      borderRadius: 1,
                      '&:hover': {
                        backgroundColor: 'action.hover',
                      },
                      transition: 'background-color 0.2s',
                    }}
                  >
                    {/* Project name */}
                    <Box
                      sx={{
                        width: 220,
                        pr: 2,
                        flexShrink: 0,
                      }}
                    >
                      <Tooltip title={project.description || project.name}>
                        <Typography
                          variant="body2"
                          sx={{
                            fontWeight: 600,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            color: 'text.primary',
                            mb: 0.5,
                          }}
                        >
                          {project.name}
                        </Typography>
                      </Tooltip>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                        {format(projectStart, 'MMM d')} {isSameDay ? '' : `- ${format(projectEnd, 'MMM d')}`}
                      </Typography>
                    </Box>

                    {/* Timeline bar */}
                    <Box
                      sx={{
                        flex: 1,
                        position: 'relative',
                        height: 40,
                        backgroundColor: 'grey.100',
                        borderRadius: 1.5,
                        overflow: 'visible',
                        border: '1px solid rgba(0,0,0,0.08)',
                      }}
                    >
                      <Tooltip
                        title={
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                              {project.name}
                            </Typography>
                            <Typography variant="caption" display="block">
                              Status: <strong>{project.status}</strong>
                            </Typography>
                            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                              {format(projectStart, 'MMM d, yyyy')} {isSameDay ? '' : `- ${format(projectEnd, 'MMM d, yyyy')}`}
                            </Typography>
                            <Typography variant="caption" display="block" sx={{ mt: 0.5 }}>
                              Duration: {isSameDay ? 'Same day' : `${duration} ${duration === 1 ? 'day' : 'days'}`}
                            </Typography>
                          </Box>
                        }
                        arrow
                      >
                        <Box
                          sx={{
                            position: 'absolute',
                            left,
                            width: isSameDay ? '4px' : width,
                            height: '100%',
                            minWidth: isSameDay ? '4px' : undefined,
                            backgroundColor: statusColor,
                            borderRadius: isSameDay ? '2px' : 1.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: isSameDay ? 'flex-start' : 'center',
                            color: 'white',
                            fontSize: isSameDay ? '0' : '0.75rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                            '&:hover': {
                              opacity: 0.9,
                              transform: isSameDay ? 'scaleX(2)' : 'translateY(-2px)',
                              boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
                              zIndex: 10,
                            },
                          }}
                        >
                          {!isSameDay && `${duration} ${duration === 1 ? 'day' : 'days'}`}
                        </Box>
                      </Tooltip>
                      {isSameDay && (
                        <Box
                          sx={{
                            position: 'absolute',
                            left: `calc(${left} + 8px)`,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            backgroundColor: statusColor,
                            color: 'white',
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                            zIndex: 5,
                          }}
                        >
                          Same day
                        </Box>
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>

            {/* Legend */}
            <Box 
              sx={{ 
                mt: 4, 
                pt: 3,
                borderTop: '1px solid rgba(0,0,0,0.08)',
                display: 'flex', 
                gap: 3, 
                flexWrap: 'wrap',
                justifyContent: 'center',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: 1,
                    backgroundColor: theme.palette.success.main,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }}
                />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>Completed</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: 1,
                    backgroundColor: theme.palette.info.main,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }}
                />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>In Progress</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: 1,
                    backgroundColor: theme.palette.warning.main,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }}
                />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>On Hold</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: 1,
                    backgroundColor: theme.palette.error.main,
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }}
                />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>Cancelled</Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: 1,
                    backgroundColor: theme.palette.grey[400],
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  }}
                />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>Planning</Typography>
              </Box>
            </Box>
          </Box>
        )}
      </Box>
    </Card>
  );
};

export default GanttChart;


