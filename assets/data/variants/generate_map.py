import os
import json

print('Reading files.')
dirs = list(os.walk('.'))
all_variants = {}

print('Creating dict.')
for i in range(2, len(dirs)):
	if '\\' not in dirs[i][0][2:] or not dirs[i][2]:
		continue
		
	directory_split = r'{}'.format(dirs[i][0][2:]).split('\\')
	all_variants['{0}:{1}'.format(directory_split[0], directory_split[1])] = dirs[i][2]

print('Writing to file.')
with open('map.json', 'w') as f:
	json.dump(all_variants, f)
	
print('Complete.')
